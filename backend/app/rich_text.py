"""Validate a small structured rich-text vocabulary; never store executable HTML."""
import re
from urllib.parse import urlsplit

INLINE = {'text', 'hardBreak'}
BLOCKS = {'paragraph', 'heading', 'bulletList', 'orderedList', 'blockquote', 'horizontalRule'}

def safe_link(value):
    if not isinstance(value, str) or not value or re.search(r'[\x00-\x20\x7f\\]', value):
        return False
    if value.startswith('/') and not value.startswith('//'):
        return True
    try:
        url = urlsplit(value)
        return (url.scheme in ['http', 'https'] and bool(url.netloc)) or (url.scheme == 'mailto' and bool(url.path))
    except ValueError:
        return False

def validate_document(document):
    if document is None:
        return None
    count, length = 0, 0
    def visit(node, depth=0):
        nonlocal count, length
        count += 1
        if depth > 24 or count > 10000 or not isinstance(node, dict):
            raise ValueError('Rich text is too complex')
        kind = node.get('type')
        if not isinstance(kind, str) or kind not in BLOCKS | INLINE | {'doc', 'listItem'} or (depth == 0 and kind != 'doc') or (depth > 0 and kind == 'doc'):
            raise ValueError('Unsupported rich text node')
        result = {'type': kind}
        if kind == 'text':
            value = node.get('text')
            if not isinstance(value, str) or not value or len(value) > 15000:
                raise ValueError('Text nodes must contain 1–15000 characters')
            length += len(value)
            if length > 200000:
                raise ValueError('Body content must be 200000 characters or less')
            result['text'] = value
            marks = node.get('marks', [])
            if not isinstance(marks, list) or len(marks) > 5:
                raise ValueError('Invalid text formatting')
            result_marks = []
            for mark in marks:
                if not isinstance(mark, dict) or mark.get('type') not in ['bold','italic','underline','strike','link']:
                    raise ValueError('Unsupported text formatting')
                item = {'type': mark['type']}
                if mark['type'] == 'link':
                    attrs = mark.get('attrs') or {}
                    if not isinstance(attrs, dict): raise ValueError('Invalid link attributes')
                    href = attrs.get('href')
                    if not safe_link(href):
                        raise ValueError('Links must use HTTP, HTTPS, mailto or a local path')
                    item['attrs'] = {'href': href}
                result_marks.append(item)
            if result_marks:
                result['marks'] = result_marks
        content = node.get('content', [])
        if not isinstance(content, list):
            raise ValueError('Invalid rich text content')
        children = [visit(child, depth + 1) for child in content]
        allowed = INLINE if kind in ['paragraph','heading'] else {'listItem'} if kind in ['bulletList','orderedList'] else BLOCKS
        if kind in ['text','hardBreak','horizontalRule'] and children:
            raise ValueError('Leaf nodes cannot have children')
        if any(child['type'] not in allowed for child in children):
            raise ValueError('Invalid rich text nesting')
        if kind == 'listItem' and (not children or children[0]['type'] != 'paragraph'):
            raise ValueError('List items must start with a paragraph')
        if kind in ['bulletList','orderedList'] and not children:
            raise ValueError('Lists must contain an item')
        attrs = node.get('attrs') or {}
        if not isinstance(attrs, dict):
            raise ValueError('Invalid node attributes')
        if kind == 'heading':
            level = attrs.get('level', 2)
            if level not in [2,3]: raise ValueError('Use heading levels 2 or 3')
            result['attrs'] = {'level':level}
        if kind == 'orderedList':
            start = attrs.get('start', 1)
            if type(start) is not int or not 1 <= start <= 1000000: raise ValueError('Invalid list start')
            result['attrs'] = {'start':start}
        if children:
            result['content'] = children
        return result
    return visit(document)

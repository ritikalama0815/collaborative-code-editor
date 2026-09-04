/**
 * @fileoverview CodeMirror 5 wrapper. Owns the textarea and exposes get/set to the parent.
 */

import React, { useEffect, useRef } from 'react';
import CodeMirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/midnight.css';
import 'codemirror/mode/python/python';
import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/closebrackets';

/**
 * @typedef {object} EditorActProps
 * @property {function(string): void} [onCodeChange] Fired on local typing (not remote `setValue`).
 * @property {function({ setCode: function(string): void, getCode: function(): string }): void} [onReady]
 *   Called once after CodeMirror is created so the parent can run Python and apply remote sync.
 */

/**
 * Mounts CodeMirror from a hidden textarea. Keep `onReady` wired or Run Python sends empty code.
 *
 * @param {EditorActProps} props
 * @returns {JSX.Element}
 */
const EditorAct = ({ onCodeChange, onReady }) => {
  /** @type {React.MutableRefObject<HTMLTextAreaElement|null>} Host node for `fromTextArea`. */
  const textareaRef = useRef(null);
  /** @type {React.MutableRefObject<import('codemirror').Editor|null>} Live CodeMirror instance. */
  const editorRef = useRef(null);
  /** @type {React.MutableRefObject<EditorActProps['onCodeChange']>} Latest change callback without remounting. */
  const onCodeChangeRef = useRef(onCodeChange);
  /** @type {React.MutableRefObject<EditorActProps['onReady']>} Latest ready callback without remounting. */
  const onReadyRef = useRef(onReady);

  onCodeChangeRef.current = onCodeChange;
  onReadyRef.current = onReady;

  useEffect(() => {
    if (!textareaRef.current || editorRef.current) {
      return;
    }

    /**
     * CodeMirror 5 CJS/ESM interop (`default` when bundled by webpack).
     * @type {typeof import('codemirror')}
     */
    const CodeMirrorCtor = CodeMirror.default ?? CodeMirror;
    /** @type {import('codemirror').Editor} Editor bound to the textarea. */
    const editor = CodeMirrorCtor.fromTextArea(textareaRef.current, {
      mode: 'python',
      theme: 'midnight',
      lineNumbers: true,
      autoCloseTags: true,
      autoCloseBrackets: true,
      indentUnit: 4,
    });

    editor.setSize('100%', '100%');
    editor.setValue('# start coding\nprint("hello")\n');
    editor.refresh();
    editorRef.current = editor;

    /**
     * Forwards local edits to the parent. Ignores `setValue` so remote sync does not echo.
     *
     * @param {import('codemirror').Editor} instance The CodeMirror editor.
     * @param {{ origin?: string }} changes CodeMirror change object.
     * @returns {void}
     */
    const handleLocalChange = (instance, changes) => {
      if (changes.origin === 'setValue') {
        return;
      }
      onCodeChangeRef.current?.(instance.getValue());
    };

    editor.on('change', handleLocalChange);

    onReadyRef.current?.({
      /**
       * Replaces the document without moving the caret when possible.
       *
       * @param {string} code Incoming shared text.
       * @returns {void}
       */
      setCode: (code) => {
        if (code == null || editor.getValue() === code) {
          return;
        }
        /** @type {{ line: number, ch: number }} Cursor to restore after `setValue`. */
        const cursor = editor.getCursor();
        editor.setValue(code);
        editor.setCursor(cursor);
      },
      /**
       * @returns {string} Full editor buffer for `POST /run`.
       */
      getCode: () => editor.getValue(),
    });

    /**
     * Recalculates layout after window resize (CodeMirror needs an explicit refresh).
     *
     * @returns {void}
     */
    const refresh = () => editor.refresh();
    window.addEventListener('resize', refresh);
    requestAnimationFrame(refresh);

    return () => {
      window.removeEventListener('resize', refresh);
      editor.off('change', handleLocalChange);
      editor.toTextArea();
      editorRef.current = null;
    };
  }, []);

  return (
    <div className="realtime-editor">
      <textarea ref={textareaRef} id="realTimeEditor" />
    </div>
  );
};

export default EditorAct;

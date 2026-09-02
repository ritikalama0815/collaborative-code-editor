import React, { useEffect, useRef } from 'react';
import CodeMirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/midnight.css';
import 'codemirror/mode/python/python';
import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/closebrackets';

const EditorAct = ({ onCodeChange, onReady }) => {
  const textareaRef = useRef(null);
  const editorRef = useRef(null);
  const onCodeChangeRef = useRef(onCodeChange);
  const onReadyRef = useRef(onReady);

  onCodeChangeRef.current = onCodeChange;
  onReadyRef.current = onReady;

  useEffect(() => {
    if (!textareaRef.current || editorRef.current) {
      return;
    }

    const CodeMirrorCtor = CodeMirror.default ?? CodeMirror;
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

    const handleLocalChange = (instance, changes) => {
      if (changes.origin === 'setValue') {
        return;
      }
      onCodeChangeRef.current?.(instance.getValue());
    };

    editor.on('change', handleLocalChange);

    onReadyRef.current?.({
      setCode: (code) => {
        if (code == null || editor.getValue() === code) {
          return;
        }
        const cursor = editor.getCursor();
        editor.setValue(code);
        editor.setCursor(cursor);
      },
      getCode: () => editor.getValue(),
    });

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

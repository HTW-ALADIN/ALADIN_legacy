import { IComponent } from "@/interfaces/TaskGraphInterface";

interface ICodeEditor extends IComponent {
  methods: {
    showSolution: string;
    copyToClipBoard: string;
  };
  component: {
    code: string;
    language: string;
  };
  dependencies: {
    CodeEditor: { validCode: string };
  };
  actions: [
    {
      type: "execute";
      instruction: string;
      label: string;
      keyboardShortcut: [{ property: "key"; value: "Enter" }, { property: "ctrlKey"; value: true }];
    }
  ];
}

export { ICodeEditor };

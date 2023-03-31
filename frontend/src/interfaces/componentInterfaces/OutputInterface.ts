import { IComponent } from "@/interfaces/TaskGraphInterface";

interface IOutput extends IComponent {
  component: {
    header: string;
  };
  dependencies: {
    Output: {
      serverOuput: string;
    };
  };
}

export { IOutput };

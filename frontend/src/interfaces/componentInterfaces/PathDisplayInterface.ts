import { IComponent } from "@/interfaces/TaskGraphInterface";

interface IPathDisplay extends IComponent {
  dependencies: {
    PathDisplay: {
      nodes: string;
      selectedPaths: string;
    };
  };
}

export { IPathDisplay };

import { IComponent } from "@/interfaces/TaskGraphInterface";

interface IPath {
  weight: number | string;
  between: Array<number>;
}

// semantic workaround as typescript doesn't allow string matching -> https://stackoverflow.com/questions/42584228/how-can-i-define-a-type-for-a-css-color-in-typescript
// should be in shape of "#321321" or "#321" or e.g. "red", "blue", etc..
interface IColor {
  [key: string]: string;
}

interface IVisualGraphTraversal extends IComponent {
  dependencies: {
    DOTGraph: {
      dotDescription: string;
    };
    VisualGraphTraversal: {
      nodes: string;
      paths: string;
      dotDescription: string;
    };
  };
  component: {
    selectedPaths: Array<IPath>;
    colorCoding: {
      standard: IColor;
      completed: IColor;
      selected: IColor;
      partial: IColor;
    };
  };
}

export { IVisualGraphTraversal };

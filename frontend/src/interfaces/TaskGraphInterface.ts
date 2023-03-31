import { IMatrixComponent } from "@/interfaces/componentInterfaces/MatrixInterface";
import { IDOTGraphComponent } from "@/interfaces/componentInterfaces/DOTGraphInterface";
import { ITaskConfigurationComponent } from "@/interfaces/componentInterfaces/TaskConfigurationInterface";
import { IDecisionNode } from "@/interfaces/componentInterfaces/DecisionNodeInterface";

// defaults to string as typescript not yet allows for true regex based string checks
// must have shape "i__am__a__path"
export type taskGraphPath = string;

interface IEdges {
  [key: number]: Array<number>;
}

export interface ILayout {
  x: number;
  y: number;
  w: number;
  h: number;
  i: number;
  static: boolean;
}

export interface ILayouts {
  sm: ILayout[];
  md: ILayout[];
  lg: ILayout[];
}

interface IDependencies {
  [componentName: string]: {
    [dependencyName: string]: taskGraphPath;
  };
}

type keyboardEventProperties = "ctrlKey" | "altKey" | "key" | "keyCode";
interface IKeyboardShortCut {
  property: keyboardEventProperties;
  value: boolean | number | string;
}

interface IAction {
  instruction: string;
  label: string;
  type: string;
  keyboardShortcut?: Array<IKeyboardShortCut>;
  parameters?: { [parameter: string]: taskGraphPath };
}

interface IHint {
  active: boolean;
  current: number;
  descriptions: Array<string>;
}

interface IModal {
  type: string;
  trigger: {
    type: string;
    component: taskGraphPath;
  };
  content: { header: string; body: string; buttons: [{ label: string; function: string; args: Array<string> }] };
  active: boolean;
}

interface IComponent {
  type: string;
  name: string;
  component: object;
  isValid: boolean;
  dependencies?: IDependencies;
  methods?: { [key: string]: string };
  actions?: Array<IAction>;
  modals?: Array<IModal>;
}

interface IComponents {
  [key: number]: IMatrixComponent | IDOTGraphComponent | ITaskConfigurationComponent | IComponent | object;
}

export interface IReplay {
  steps: Array<any>;
  mouse?: Array<any>;
  panning?: Array<any>;
  zooming?: Array<any>;
  meta: { [key: string]: any };
}

export interface IInterjection {
  dependencies: { [dependencyName: string]: taskGraphPath | number };
  method: string;
  applied?: boolean;
  component_id?: string;
}

interface INodes {
  [key: number]:
    | IDecisionNode
    | {
        layouts: ILayouts;
        hints?: IHint;
        components: IComponents;
        zoomScale: number;
        interjections?: Array<IInterjection>;
      };
}

interface IState {
  isLoading: boolean;
  previousNode: number;
  rootNode: number;
  currentTask: string;
  layoutSize: string;
  taskData: { [key: string]: any };
  topology: Array<Array<number>>;
  edges: IEdges;
  currentNode: number;
  nodes: INodes;
  taskReplay?: IReplay;
  restoredFromReplay?: boolean;
}

export { IState, IComponent };

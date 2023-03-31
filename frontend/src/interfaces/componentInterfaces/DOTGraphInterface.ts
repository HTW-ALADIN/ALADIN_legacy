import { IComponent } from "@/interfaces/TaskGraphInterface";

interface IDOTGraphComponent extends IComponent {
  dependencies: {
    DOTGraph: { dotDescription: string };
  };
}

export { IDOTGraphComponent };

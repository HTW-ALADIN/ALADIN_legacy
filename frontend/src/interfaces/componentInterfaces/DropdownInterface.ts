import { IComponent } from "@/interfaces/TaskGraphInterface";

interface IDropdown extends IComponent {
  component: {
    selected: string;
    header: string;
  };
}

export { IDropdown };

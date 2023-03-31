interface IPathDescription {
  image: string;
  description: string;
  title: string;
}

interface IDecisionNode {
  pathDescriptions: {
    [key: number]: IPathDescription;
  };
}

export { IDecisionNode };

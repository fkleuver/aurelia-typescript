// tslint:disable
export function createPipelineState() {
  let nextResult: any = null;
  let cancelResult: any = null;

  let next: any = () => {
    nextResult = true;
    return Promise.resolve(nextResult);
  };

  next.cancel = (rejection: any) => {
    cancelResult = rejection || "cancel";
    return Promise.resolve(cancelResult);
  };

  return {
    next,
    get result() {
      return nextResult;
    },
    get rejection() {
      return cancelResult;
    }
  };
}

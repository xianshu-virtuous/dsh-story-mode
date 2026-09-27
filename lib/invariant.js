//#region src/invariant.ts
const name = "dsh-story-mode-invariant";
const inject = ["invariants"];
const install = () => {};
const apply = (ctx) => Promise.resolve(ctx.invariants.register("@dsh-external/dsh-story-mode", install));
//#endregion
export { apply, inject, name };

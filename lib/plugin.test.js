import { mockPlugin, mockApp } from "./test-helpers.js"

// --------------------------------------------------------------------------------------
// Note that some of these tests actually make calls to OpenAI. Normally tests would be mocked for
// a remote call, but for Bill's current purposes, it's pretty useful to be able to see what the real
// API responds with as I iterate upon new possible methods
describe("plugin", () => {
  const plugin = mockPlugin();

  it("should have a name", () => {
    expect(plugin.constants.pluginName).toBe("Ample Image Generator");
  });

  it("should offer expression commands", () => {
    expect(plugin.insertText["image in context"]).toBeDefined();
  })

  it("should offer replace text options", () => {
    expect(plugin.replaceText.complete).toBeDefined();
  });

  // --------------------------------------------------------------------------------------
  describe("with a mocked app", () => {
    const app = mockApp();

    it("should look up thesaurus entries from within a check list", async () => {
      app.notes.find.mockReturnValue({
        content: () => `Weekly bucket list:
        [ ] Get ripped
        [ ] Get rich
        [ ] Allow a PR to be merged to provider w/ test
        [ ] Finalize PR for table formulas
        [ ] Get a job`
      });
      app.prompt = (title, parameters) => {
        const inputs = parameters.inputs;
        expect(inputs).toBeInstanceOf(Array);
        expect(inputs).toHaveLength(1);
        const selectInput = inputs[0];
      }
    });

    it("should allow image lookup", async () => {
      app.prompt.mockReturnValue("A red ball");
      const result = await plugin.insertText["image via prompt"](app);
      expect(/!\[image\]\(http/.test(result)).toBeTruthy()
    }, 10000);
  });
});

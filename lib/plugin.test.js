import { jest } from "@jest/globals"
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

    it("should suggest an image based on preceding contents of line", async () => {
      app.notes.find.mockReturnValue({
        attachMedia: () => "https://images.amplenote.com/ample-image-generator/1.png",
        content: () => `Weekly goals:
        [ ] Action hero saving a pug and french bulldog puppy from an exploding building {${ plugin.constants.pluginName }: image from preceding}
        [ ] Adopt a pound puppy`
      });
      app.prompt = (title, options) => {
        const inputs = options.inputs;
        expect(inputs).toBeInstanceOf(Array);
        expect(inputs).toHaveLength(1);
        const selectInput = inputs[0];
        const selectedInputOptions = selectInput.options;
        expect(selectedInputOptions).toHaveLength(3);
        const selectedOption = selectedInputOptions[0];
        return selectedOption.value;
      }
      const result = await plugin.insertText["image from preceding"](app);
      expect(/!\[image\]\(http/.test(result)).toBeTruthy();
    }, 30000);

    it("should allow image lookup", async () => {
      app.prompt.mockReturnValue("A red ball");
      const result = await plugin.insertText["image via prompt"](app);
      expect(/!\[image\]\(http/.test(result)).toBeTruthy()
    }, 10000);
  });
});

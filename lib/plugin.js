import fetch from "isomorphic-fetch"

// Latest docs https://www.amplenote.com/help/developing_amplenote_plugins
const plugin = {
  // --------------------------------------------------------------------------------------
  constants: {
    defaultSystemPrompt: "You are a helpful assistant.",
    defaultDimension: 1024,
    generatedImageCount: 3,
    pluginName: "Ample Image Generator",
  },

  // --------------------------------------------------------------------------------------
  insertText: {
    "image in context": async function(app) {
      const noteContent = await app.notes.find(app.context.noteUUID).content();
      const markdown = this._imageMarkdownFromPrompt(app, noteContent);
      if (markdown) app.context.replaceSelection(markdown);

    },
    "image via prompt": async function(app) {
      const instruction = await app.prompt("What would you like to generate images of?");
      if (!instruction) return;
      const markdown = this._imageMarkdownFromPrompt(app, instruction);
      if (markdown) app.context.replaceSelection(markdown);
    },
  },

  // --------------------------------------------------------------------------------------
  // https://www.amplenote.com/help/developing_amplenote_plugins#noteOption
  noteOption: {
    "intro image": async function(app, noteUUID) {
      const note = await app.notes.find(noteUUID);
      const noteContent = await note.content();
      const markdown = await this._imageMarkdownFromPrompt(app, noteContent);
      if (markdown) {
        note.insertContent(markdown);
      }
    },
  },

  // --------------------------------------------------------------------------------------
  async _imageMarkdownFromPrompt(app, prompt) {
    const width = app.settings["Image width (default is 1024)"].trim() || this.constants.defaultDimension;
    const height = app.settings["Image height (default is 1024)"].trim() || this.constants.defaultDimension;
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ app.settings["API Key"].trim() }`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt,
        n: app.settings["Images per prompt (default 3)"] || this.constants.generatedImageCount,
        size: `${ width }x${ height }`,
      })
    });
    const result = await response.json();
    const { data } = result;
    if (data?.length) {
      const urls = data.map(d => d.url);

      const imageList = urls.map(imageURL => `![image](${ imageURL })`).join("\n\n");
      return `${ imageList }`
    } else {
      return null;
    }
  },
};
export default plugin;

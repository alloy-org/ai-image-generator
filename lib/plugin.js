import fetch from "isomorphic-fetch"

// Latest docs https://www.amplenote.com/help/developing_amplenote_plugins
const plugin = {
  // --------------------------------------------------------------------------------------
  constants: {
    defaultSize: 512,
    generatedImageCount: 3,
    pluginName: "Ample Image Generator",
  },

  // --------------------------------------------------------------------------------------
  insertText: {
    "image from preceding": async function(app) {
      const note = await app.notes.find(app.context.noteUUID);
      const noteContent = await note.content();
      const promptIndex = noteContent.indexOf(`{${ this.constants.pluginName }: image from preceding}`);
      const precedingContent = noteContent.substring(0, promptIndex).trim();
      const prompt = precedingContent.split("\n").pop();
      console.log("Deduced prompt as", prompt);
      if (prompt?.trim()) {
        const markdown = await this._imageMarkdownFromPrompt(app, prompt.trim(), { note });
        console.log("Received markdown", markdown);
        if (markdown) {
          app.context.replaceSelection(markdown);
        }
      } else {
        app.alert("Could not find preceding text to use as a prompt");
      }
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
    "summary image": async function(app, noteUUID) {
      const note = await app.notes.find(noteUUID);
      const noteContent = await note.content();
      const markdown = await this._imageMarkdownFromPrompt(app, noteContent, { note });
      if (markdown) {
        note.insertContent(markdown);
      }
    },
  },

  // --------------------------------------------------------------------------------------
  async _imageMarkdownFromPrompt(app, prompt, { note = null } = {}) {
    const size = app.settings["Image size (default is 512)"]?.trim() || this.constants.defaultSize;

    // https://platform.openai.com/docs/guides/images/usage
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ app.settings["API Key"].trim() }`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt,
        n: app.settings["Images per prompt (default 3)"] || this.constants.generatedImageCount,
        size: `${ size }x${ size }`,
      })
    });
    const result = await response.json();
    const { data } = result;
    if (data?.length) {
      const urls = data.map(d => d.url);
      const radioOptions = urls.map(url => ({ image: url, value: url }));
      console.log("Received options", urls);
      const chosenImageURL = await app.prompt("Select an image", { inputs: [ { label: "Choose an image", options: radioOptions, type: "radio" } ] });
      if (chosenImageURL) {
        console.log("Fetching chosen URL", chosenImageURL)
        const imageData = await this._fetchImageAsDataURL(chosenImageURL);
        console.log("Got imageData length", imageData && imageData.length);
        if (!note) note = await app.notes.find(app.context.noteUUID);
        const ampleImageUrl = await note.attachMedia(imageData);
        return `![image](${ ampleImageUrl })`;
      }
      return null;
    } else {
      return null;
    }
  },

  // --------------------------------------------------------------------------------------
  async _fetchImageAsDataURL(url) {
    const response = await fetch(url);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = event => {
        resolve(event.target.result);
      };

      reader.onerror = function(event) {
        reader.abort();
        reject(event.target.error);
      };

      reader.readAsDataURL(blob);
    });
  }
};
export default plugin;

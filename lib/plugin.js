import fetch from "isomorphic-fetch"

// Latest docs https://www.amplenote.com/help/developing_amplenote_plugins
const plugin = {
  // --------------------------------------------------------------------------------------
  constants: {
    defaultSize: 1024,
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
        console.log("Received markdown", markdown)
        if (markdown) {
          app.context.replaceSelection(markdown);
        }
      } else {
        app.alert("Could not find preceding text to use as a prompt");
      }
    },
    "image via prompt": async function(app) {
      console.log("image via prompt")
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
    const size = app.settings["Image size (default is 1024)"]?.trim() || this.constants.defaultSize;

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
      console.log("Received options", urls, "maps to radioOptions", radioOptions);
      const chosenImageURL = await app.prompt("Select an image", { inputs: [ { label: "Choose an image", options: radioOptions, type: "radio" } ] });
      if (chosenImageURL) {
        console.log("Fetching chosen URL", chosenImageURL)
        const readerResult = await this._fetchImageAsDataURL(chosenImageURL);
        console.log("Got readerResult", readerResult.result, "length", readerResult.length);
        // console.log("Got imageData", imageData);
        if (!note) note = await app.notes.find(app.context.noteUUID);
        const ampleImageUrl = await note.attachMedia(readerResult.result);
        console.log("Got ampleImageUrl", ampleImageUrl, "returning markdown")
        return `![image](${ ampleImageUrl })`;
      }
      return null;
    } else {
      return null;
    }
  },

  // --------------------------------------------------------------------------------------
  async _fetchImageAsDataURL(url) {
    const response = await fetch(url, { mode: "no-cors" });
    const blob = await response.blob();
    console.log("Got blob of type", blob.type);
    return new Promise((resolve, reject) => {
      console.log("Initializing file reader")
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      console.log("Reading blob", blob);
      reader.readAsDataURL(blob);
    });
  }
};
export default plugin;

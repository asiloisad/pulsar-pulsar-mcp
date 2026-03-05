const { SelectListView, highlightMatches } = require("@asiloisad/select-list");

class ToggleToolsView {
  constructor(getTools) {
    this.getTools = getTools;
    this.disabledTools = [];
    this.selectList = new SelectListView({
      className: "pulsar-mcp",
      emptyMessage: "No MCP tools found",
      helpMarkdown:
        "Available commands:\n" +
        "- **Enter** — Toggle selected tool\n" +
        "- **Alt+=** — Enable all tools\n" +
        "- **Alt+-** — Disable all tools\n" +
        "- **Alt+0** — Reset to defaults",
      willShow: () => {
        this.disabledTools = atom.config.get("pulsar-mcp.disabledTools") || [];
        this.selectList.update({ items: this.getTools() });
      },
      filterKeyForItem: (item) => item.name + " " + item.description,
      elementForItem: (item, { matchIndices }) => {
        const isDisabled = this.disabledTools.includes(item.name);
        const li = document.createElement("li");
        const primary = document.createElement("div");
        primary.classList.add("primary-line");
        const icon = document.createElement("span");
        icon.classList.add("icon", isDisabled ? "icon-circle-slash" : "icon-check");
        primary.appendChild(icon);
        const tag = document.createElement("span");
        tag.classList.add("tag");
        tag.appendChild(highlightMatches(item.name, matchIndices));
        primary.appendChild(tag);
        if (item.description) {
          primary.appendChild(document.createTextNode(item.description));
        }
        li.appendChild(primary);
        return li;
      },
      didConfirmSelection: (item) => {
        const index = this.selectList.selectionIndex;
        this.toggleTool(item.name);
        this.selectList.update({ items: this.getTools() });
        this.selectList.selectIndex(index);
      },
      didCancelSelection: () => {
        this.selectList.hide();
      },
    });

    this.commands = atom.commands.add(this.selectList.element, {
      "select-list:enable-all": () => this.enableAll(),
      "select-list:disable-all": () => this.disableAll(),
      "select-list:reset-defaults": () => this.resetDefaults(),
    });
  }

  toggle() {
    this.selectList.toggle();
  }

  toggleTool(name) {
    const index = this.disabledTools.indexOf(name);
    if (index === -1) {
      this.disabledTools.push(name);
    } else {
      this.disabledTools.splice(index, 1);
    }
    atom.config.set("pulsar-mcp.disabledTools", this.disabledTools);
  }

  enableAll() {
    this.disabledTools = [];
    atom.config.set("pulsar-mcp.disabledTools", this.disabledTools);
    const index = this.selectList.selectionIndex;
    this.selectList.update({ items: this.getTools() });
    this.selectList.selectIndex(index);
  }

  disableAll() {
    this.disabledTools = this.getTools().map((t) => t.name);
    atom.config.set("pulsar-mcp.disabledTools", this.disabledTools);
    const index = this.selectList.selectionIndex;
    this.selectList.update({ items: this.getTools() });
    this.selectList.selectIndex(index);
  }

  resetDefaults() {
    const schema = atom.config.getSchema("pulsar-mcp.disabledTools");
    this.disabledTools = schema?.default ? [...schema.default] : [];
    atom.config.set("pulsar-mcp.disabledTools", this.disabledTools);
    const index = this.selectList.selectionIndex;
    this.selectList.update({ items: this.getTools() });
    this.selectList.selectIndex(index);
  }

  destroy() {
    this.commands.dispose();
    this.selectList.destroy();
  }
}

module.exports = ToggleToolsView;

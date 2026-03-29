const { SelectListView, highlightMatches } = require("@asiloisad/select-list");

class ToggleToolsView {
  constructor(getTools) {
    this.getTools = getTools;
    this.toolList = [];
    this.listMode = "blacklist";
    this.selectList = new SelectListView({
      className: "pulsar-mcp",
      emptyMessage: "No MCP tools found",
      helpMarkdown: this._helpMarkdown(),
      willShow: () => {
        this.toolList = atom.config.get("pulsar-mcp.toolList") || [];
        this.listMode = atom.config.get("pulsar-mcp.listMode") || "blacklist";
        this.selectList.update({ items: this.getTools(), helpMarkdown: this._helpMarkdown() });
      },
      filterKeyForItem: (item) => item.name + " " + item.description,
      elementForItem: (item, { matchIndices }) => {
        const inList = this.toolList.includes(item.name);
        const isEnabled =
          this.listMode === "greenlist" ? inList : !inList;
        const li = document.createElement("li");
        const primary = document.createElement("div");
        primary.classList.add("primary-line");
        const icon = document.createElement("span");
        icon.classList.add("icon", isEnabled ? "icon-check" : "icon-circle-slash");
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
      "select-list:toggle-mode": () => this.toggleMode(),
    });
  }

  _helpMarkdown() {
    const modeLabel = this.listMode === "greenlist" ? "Greenlist" : "Blacklist";
    return (
      `Mode: **${modeLabel}**\n\n`+
      "Commands:\n" +
      "- **Enter**: Toggle tool in list\n" +
      "- **Alt+Enter**: Switch blacklist/greenlist mode\n" +
      "- **Alt+=**: Enable all tools\n" +
      "- **Alt+-**: Disable all tools\n" +
      "- **Alt+0**: Reset to defaults"
    );
  }

  toggle() {
    this.selectList.toggle();
  }

  toggleTool(name) {
    const index = this.toolList.indexOf(name);
    if (index === -1) {
      this.toolList.push(name);
    } else {
      this.toolList.splice(index, 1);
    }
    atom.config.set("pulsar-mcp.toolList", this.toolList);
  }

  toggleMode() {
    this.listMode = this.listMode === "blacklist" ? "greenlist" : "blacklist";
    atom.config.set("pulsar-mcp.listMode", this.listMode);
    const index = this.selectList.selectionIndex;
    this.selectList.update({ items: this.getTools(), helpMarkdown: this._helpMarkdown() });
    this.selectList.selectIndex(index);
  }

  enableAll() {
    // blacklist: clear list (nothing blocked)
    // greenlist: fill list (everything allowed)
    this.toolList =
      this.listMode === "greenlist" ? this.getTools().map((t) => t.name) : [];
    atom.config.set("pulsar-mcp.toolList", this.toolList);
    const index = this.selectList.selectionIndex;
    this.selectList.update({ items: this.getTools() });
    this.selectList.selectIndex(index);
  }

  disableAll() {
    // blacklist: fill list (everything blocked)
    // greenlist: clear list (nothing allowed)
    this.toolList =
      this.listMode === "blacklist" ? this.getTools().map((t) => t.name) : [];
    atom.config.set("pulsar-mcp.toolList", this.toolList);
    const index = this.selectList.selectionIndex;
    this.selectList.update({ items: this.getTools() });
    this.selectList.selectIndex(index);
  }

  resetDefaults() {
    const listSchema = atom.config.getSchema("pulsar-mcp.toolList");
    const modeSchema = atom.config.getSchema("pulsar-mcp.listMode");
    this.toolList = listSchema?.default ? [...listSchema.default] : [];
    this.listMode = modeSchema?.default || "blacklist";
    atom.config.set("pulsar-mcp.toolList", this.toolList);
    atom.config.set("pulsar-mcp.listMode", this.listMode);
    const index = this.selectList.selectionIndex;
    this.selectList.update({ items: this.getTools(), helpMarkdown: this._helpMarkdown() });
    this.selectList.selectIndex(index);
  }

  destroy() {
    this.commands.dispose();
    this.selectList.destroy();
  }
}

module.exports = ToggleToolsView;

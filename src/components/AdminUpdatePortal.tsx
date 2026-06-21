import React, { useState, useEffect } from "react";
import { 
  Folder, 
  FileText, 
  Image, 
  Save, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Eye, 
  Laptop, 
  Smartphone, 
  CheckCircle2, 
  FileCode, 
  ArrowRight, 
  Sparkles, 
  HelpCircle,
  FileDown,
  Info
} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ContentNode {
  name: string;
  type: "directory" | "file";
  path: string;
  size?: number;
  children?: ContentNode[];
}

export default function AdminUpdatePortal() {
  // Theme state
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      return (localStorage.getItem("admin-theme") as "light" | "dark") || "light";
    } catch {
      return "light";
    }
  });
  const isDark = theme === "dark";

  // Tree state
  const [tree, setTree] = useState<ContentNode | null>(null);
  const [loadingTree, setLoadingTree] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected file state
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState<string>("");
  const [originalContent, setOriginalContent] = useState<string>("");
  const [loadingFile, setLoadingFile] = useState(false);
  const [savingFile, setSavingFile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Expanded directory list (paths)
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({
    "content": true,
    "content/2026": true,
    "content/2026/06": true,
    "content/2026/06/text": true,
    "content/2026/06/body": true,
    "content/2026/06/pictures": true,
  });

  // Create month state
  const [newYear, setNewYear] = useState("2026");
  const [newMonth, setNewMonth] = useState("07");
  const [creatingMonth, setCreatingMonth] = useState(false);
  const [monthSuccess, setMonthSuccess] = useState<string | null>(null);

  // Preview simulations coordinates (Defaulting to June 2026)
  const [previewYear, setPreviewYear] = useState("2026");
  const [previewMonth, setPreviewMonth] = useState("06");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("mobile");
  
  // Loaded dynamic contents for preview representation
  const [previewData, setPreviewData] = useState<{
    text: Record<string, string>;
    body: Record<string, string>;
    pictures: Record<string, string>;
  }>({
    text: {},
    body: {},
    pictures: {},
  });
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Initialize and load structure
  useEffect(() => {
    loadTree();
    loadLivePreview(previewYear, previewMonth);
  }, []);

  const loadTree = async () => {
    setLoadingTree(true);
    setError(null);
    try {
      const res = await fetch("/api/admin-content/tree");
      if (!res.ok) throw new Error("Could not request directory hierarchy");
      const data = await res.json();
      setTree(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingTree(false);
    }
  };

  const loadLivePreview = async (year: string, month: string) => {
    setLoadingPreview(true);
    try {
      const res = await fetch(`/api/monthly-content?year=${year}&month=${month}`);
      if (res.ok) {
        const data = await res.json();
        setPreviewData({
          text: data.text || {},
          body: data.body || {},
          pictures: data.pictures || {},
        });
      }
    } catch (err) {
      console.error("Preview data sync error:", err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const toggleDirectory = (path: string) => {
    setExpandedPaths(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const handleSelectFile = async (node: ContentNode) => {
    if (node.type === "directory") return;
    setLoadingFile(true);
    setSaveSuccess(false);
    setSelectedFilePath(node.path);
    try {
      const res = await fetch(`/api/admin-content/file?path=${encodeURIComponent(node.path)}`);
      if (!res.ok) throw new Error("Unable to read selected file parameters");
      const data = await res.json();
      setEditorContent(data.content || "");
      setOriginalContent(data.content || "");
    } catch (err: any) {
      alert("Error reading file: " + err.message);
    } finally {
      setLoadingFile(false);
    }
  };

  const handleSaveFile = async () => {
    if (!selectedFilePath) return;
    setSavingFile(true);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/admin-content/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: selectedFilePath,
          content: editorContent
        })
      });
      if (!res.ok) throw new Error("Saving request rejected by the back-office file server");
      setOriginalContent(editorContent);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
      // Auto reload tree hierarchy to update file size and live preview!
      loadTree();
      loadLivePreview(previewYear, previewMonth);
    } catch (err: any) {
      alert("Error saving file: " + err.message);
    } finally {
      setSavingFile(false);
    }
  };

  const handleBootstrapMonth = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingMonth(true);
    setMonthSuccess(null);
    try {
      const res = await fetch("/api/admin-content/create-month", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: newYear,
          month: newMonth
        })
      });
      if (!res.ok) throw new Error("Folder generation failed");
      const data = await res.json();
      setMonthSuccess(`Created and seeded structured campaign: content/${newYear}/${newMonth}`);
      
      // Auto expand newly created subdirectories so the user sees them immediately!
      const formattedMonth = String(newMonth).padStart(2, "0");
      setExpandedPaths(prev => ({
        ...prev,
        "content": true,
        [`content/${newYear}`]: true,
        [`content/${newYear}/${formattedMonth}`]: true,
        [`content/${newYear}/${formattedMonth}/text`]: true,
        [`content/${newYear}/${formattedMonth}/body`]: true,
        [`content/${newYear}/${formattedMonth}/pictures`]: true,
      }));

      // Swap preview to newly created month
      setPreviewYear(newYear);
      setPreviewMonth(formattedMonth);
      loadLivePreview(newYear, formattedMonth);
      loadTree();
      
      setTimeout(() => setMonthSuccess(null), 5000);
    } catch (err: any) {
      alert("Failed to bootstrap: " + err.message);
    } finally {
      setCreatingMonth(false);
    }
  };

  const handleDeleteFile = async (pathToDelete: string) => {
    if (!window.confirm(`Are you absolutely sure you want to delete ${pathToDelete}?`)) return;
    try {
      const res = await fetch("/api/admin-content/delete-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathToDelete })
      });
      if (!res.ok) throw new Error("Delete action failed on server");
      
      if (selectedFilePath === pathToDelete) {
        setSelectedFilePath(null);
        setEditorContent("");
      }
      loadTree();
      loadLivePreview(previewYear, previewMonth);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteMonth = async (year: string, month: string) => {
    if (!window.confirm(`Security Alert: Delete 'content/${year}/${month}' and all its subfolders?`)) return;
    try {
      const res = await fetch("/api/admin-content/delete-month", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month })
      });
      if (!res.ok) throw new Error("Delete action failed");
      
      setSelectedFilePath(null);
      setEditorContent("");
      loadTree();
      // Reset preview coordinates if they match the deleted content
      if (previewYear === year && previewMonth === month) {
        setPreviewYear("2026");
        setPreviewMonth("06");
        loadLivePreview("2026", "06");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Helper renderer for recursive directory tree nodes
  const renderTreeNode = (node: ContentNode, depth = 0) => {
    const isDir = node.type === "directory";
    const isExpanded = expandedPaths[node.path] || false;
    const isSelected = selectedFilePath === node.path;
    const isMonthFolder = isDir && depth === 2; // content/<year>/<month> e.g. content/2026/06

    // Icon parsing
    let NodeIcon = FileText;
    if (isDir) {
      NodeIcon = Folder;
    } else if (node.name.endsWith(".txt") && node.path.includes("/pictures/")) {
      NodeIcon = Image;
    } else if (node.name.endsWith(".json")) {
      NodeIcon = FileCode;
    }

    // Color coordination based on parent folder prefix
    let folderBadgeColor = "text-stone-400";
    if (node.path.includes("/pictures")) folderBadgeColor = "text-amber-500";
    else if (node.path.includes("/body")) folderBadgeColor = "text-rose-500";
    else if (node.path.includes("/text")) folderBadgeColor = "text-emerald-500";

    return (
      <div key={node.path} className="select-none font-sans">
        <div 
          onClick={() => {
            if (isDir) {
              toggleDirectory(node.path);
            } else {
              handleSelectFile(node);
            }
          }}
          className={`group flex items-center justify-between py-1.5 px-3 rounded-lg text-xs cursor-pointer transition duration-150 ${
            isSelected 
              ? (isDark ? "bg-amber-600/30 text-amber-300 border border-amber-700/50 font-medium" : "bg-[#1A1A1A] text-white font-medium") 
              : (isDark ? "text-stone-300 hover:bg-stone-900/60" : "text-stone-700 hover:bg-stone-100")
          }`}
          style={{ paddingLeft: `${Math.max(12, depth * 16)}px` }}
        >
          <div className="flex items-center gap-2 truncate">
            {isDir && (
              <span className={`text-[10px] transform transition-transform duration-200 ${isExpanded ? "rotate-90" : "rotate-0"} text-stone-400 font-mono`}>
                ▶
              </span>
            )}
            <NodeIcon className={`w-3.5 h-3.5 shrink-0 ${isDir ? (isDark ? "text-stone-400" : "text-stone-500") : folderBadgeColor}`} />
            <span className="truncate">{node.name}</span>
            {!isDir && node.size !== undefined && (
              <span className="text-[9px] text-stone-400 font-mono scale-90">({node.size}B)</span>
            )}
          </div>

          {/* Inline Action Controls */}
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
            {isMonthFolder && (
              <button
                title="Delete this month folder and all child contents"
                onClick={(e) => {
                  e.stopPropagation();
                  const parts = node.path.split("/");
                  handleDeleteMonth(parts[1], parts[2]);
                }}
                className={`p-1 rounded shadow-xs transition ${
                  isDark 
                    ? "bg-stone-900 text-stone-400 hover:text-rose-400 hover:bg-rose-950/30" 
                    : "bg-white text-stone-400 hover:text-red-500 hover:bg-red-50"
                }`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
            {!isDir && (
              <button
                title="Delete File"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteFile(node.path);
                }}
                className={`p-1 rounded shadow-xs transition ${
                  isDark 
                    ? "bg-stone-900 text-stone-400 hover:text-rose-400 hover:bg-rose-950/30" 
                    : "bg-white text-stone-400 hover:text-red-500 hover:bg-red-50"
                }`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {isDir && isExpanded && node.children && (
          <div className="mt-0.5">
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Quick Preset Helper for the text editor
  const applyPreset = (type: "headline" | "markdown" | "image") => {
    if (!selectedFilePath) return;
    
    if (type === "headline") {
      setEditorContent("🌸 Radiate Elegance - Handcrafted Fine Art Overlay");
    } else if (type === "markdown") {
      setEditorContent(`### Luxury Treatment Spotlights\n\nExperience ultimate bliss with our custom **June Paraffin Wax Treatment**.\n\n- Organic Rosebuds Essential Care\n- Microscopic Russian structure alignment\n- Finished with a luxurious magnetic starlight wand.`);
    } else if (type === "image") {
      setEditorContent("https://images.unsplash.com/photo-1632345031435-8797b2d58045?w=600&q=80");
    }
  };

  return (
    <div className={`border rounded-[28px] overflow-hidden shadow-xs grid grid-cols-1 lg:grid-cols-12 min-h-[750px] font-sans transition-colors duration-200 ${
      isDark 
        ? "bg-stone-950 border-stone-800 text-stone-100" 
        : "bg-[#FAF9F6] border-stone-200 text-stone-800"
    }`}>
      
      {/* LEFT COLUMN: FOLDER STRUCTURE EXPLORER & EDITOR (7/12 cols) */}
      <div className={`lg:col-span-6 p-5 flex flex-col justify-between space-y-6 transition-colors duration-200 ${
        isDark ? "border-stone-850 lg:border-r" : "border-stone-200 lg:border-r"
      }`}>
        
        {/* Header Branding */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 text-left">
              <div className="flex items-center gap-1.5 text-amber-850">
                <Sparkles className={`w-4 h-4 ${isDark ? "text-amber-400" : "text-amber-850"}`} />
                <span className={`text-[10px] tracking-widest font-bold font-mono uppercase px-2 py-0.5 rounded-md transition-colors ${
                  isDark ? "bg-amber-950/40 text-amber-400 border border-amber-900/40" : "bg-amber-50 text-amber-800"
                }`}>DEPLOYMENT CENTER</span>
              </div>
              <h2 className={`text-xl font-bold font-display tracking-tight transition-colors ${isDark ? "text-stone-100" : "text-stone-800"}`}>Admin Content Update Portal</h2>
            </div>
            
            {/* Elegant Selectable Dark/Light Theme Switcher */}
            <div className={`flex items-center border rounded-lg p-0.5 transition-colors duration-200 shrink-0 ${
              isDark ? "bg-stone-900 border-stone-805" : "bg-stone-100 border-stone-200"
            }`}>
              <button
                onClick={() => {
                  setTheme("light");
                  localStorage.setItem("admin-theme", "light");
                }}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold font-mono uppercase tracking-wider transition-all duration-150 flex items-center gap-1 cursor-pointer select-none ${
                  !isDark 
                    ? "bg-white text-stone-900 shadow-xs" 
                    : "text-stone-400 hover:text-stone-200"
                }`}
              >
                Light
              </button>
              <button
                onClick={() => {
                  setTheme("dark");
                  localStorage.setItem("admin-theme", "dark");
                }}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold font-mono uppercase tracking-wider transition-all duration-150 flex items-center gap-1 cursor-pointer select-none ${
                  isDark 
                    ? "bg-amber-600 text-stone-950 shadow-xs" 
                    : "text-stone-505 hover:text-stone-800"
                }`}
              >
                Dark
              </button>
            </div>
          </div>
          <p className={`text-xs text-left transition-colors ${isDark ? "text-stone-400" : "text-stone-500"}`}>
            Write static files on disk dynamically. Change titles, copy references, and load monthly body markdown parameters instantly across the entire spa stack.
          </p>
        </div>

        {/* Dynamic Bootstrap Box */}
        <div className={`border rounded-2xl p-4 space-y-3 transition-colors duration-200 ${
          isDark ? "bg-stone-900/40 border-stone-800" : "bg-stone-50 border-stone-200"
        }`}>
          <div className="flex items-center gap-1.5 text-stone-300">
            <Plus className="w-4 h-4 text-amber-500" />
            <span className={`text-[11px] font-bold font-mono uppercase tracking-wider transition-colors ${isDark ? "text-stone-200" : "text-stone-700"}`}>Initialize New Monthly Content Folder</span>
          </div>
          <form onSubmit={handleBootstrapMonth} className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] font-bold text-stone-400 font-mono">YEAR</label>
              <input 
                type="number" 
                min="2025" 
                max="2035" 
                value={newYear} 
                onChange={(e) => setNewYear(e.target.value)}
                className={`w-16 px-2.5 py-1 text-xs font-mono font-bold rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500 text-center transition ${
                  isDark 
                    ? "bg-stone-950 text-white border-stone-800 focus:border-amber-500" 
                    : "bg-white text-stone-800 border-stone-250 focus:border-stone-400"
                }`} 
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] font-bold text-stone-400 font-mono">MONTH</label>
              <select 
                value={newMonth} 
                onChange={(e) => setNewMonth(e.target.value)}
                className={`w-24 px-2.5 py-1 text-xs rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono font-bold transition ${
                  isDark 
                    ? "bg-stone-950 text-white border-stone-800 focus:border-amber-500" 
                    : "bg-white text-stone-800 border-stone-250 focus:border-stone-400"
                }`}
              >
                {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map(m => (
                  <option key={m} value={m} className={isDark ? "bg-stone-950 text-stone-100" : "bg-white text-stone-800"}>
                    {m} ({new Date(2026, parseInt(m) - 1).toLocaleString("default", { month: "short" })})
                  </option>
                ))}
              </select>
            </div>
            <button 
              type="submit"
              disabled={creatingMonth}
              className={`disabled:opacity-40 select-none cursor-pointer rounded-md font-mono text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 shadow-xs flex items-center gap-1 shrink-0 ml-auto transition-all ${
                isDark 
                  ? "bg-amber-600 text-stone-950 hover:bg-amber-500" 
                  : "bg-[#1A1A1A] text-stone-100 hover:bg-stone-800"
              }`}
            >
              {creatingMonth ? "Generating..." : "Generate Month"}
            </button>
          </form>
          {monthSuccess && (
            <div className={`text-[10px] font-mono px-3 py-1.5 rounded-lg flex items-center gap-1.5 border transition ${
              isDark 
                ? "text-emerald-400 bg-emerald-950/20 border-emerald-900/40" 
                : "text-emerald-700 bg-emerald-50 border border-emerald-200"
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>{monthSuccess}</span>
            </div>
          )}
        </div>

        {/* 2-Column Split: Folder Explorer vs File Content Editor */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1">
          
          {/* Sub-Col 1: Recursive Folder Tree Navigation */}
          <div className={`md:col-span-12 lg:col-span-5 border rounded-2xl p-3 max-h-[360px] overflow-y-auto scrollbar-thin flex flex-col justify-between transition-colors duration-150 ${
            isDark ? "bg-stone-950 border-stone-800" : "bg-white border-stone-200"
          }`}>
            <div>
              <div className={`flex items-center justify-between border-b pb-2 mb-2 ${isDark ? "border-stone-900" : "border-stone-100"}`}>
                <span className="text-[10px] font-bold font-mono text-stone-400 uppercase tracking-widest">FILESYSTEM TREE</span>
                <button 
                  onClick={loadTree} 
                  disabled={loadingTree}
                  className={`p-1 rounded transition select-none cursor-pointer ${
                    isDark 
                      ? "text-stone-500 hover:text-stone-200 hover:bg-stone-900" 
                      : "text-stone-400 hover:text-stone-700 hover:bg-stone-150"
                  }`}
                  title="Reload Directory structure"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingTree ? "animate-spin" : ""}`} />
                </button>
              </div>

              {loadingTree ? (
                <div className="py-12 text-center text-stone-400 text-xs font-mono">
                  Reading database folder paths...
                </div>
              ) : tree ? (
                <div className="space-y-1">
                  {renderTreeNode(tree)}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-stone-400 italic">No static folder content loaded.</div>
              )}
            </div>

            <div className={`border-t pt-2 mt-4 flex items-center gap-1.5 text-[9.5px] text-stone-400 leading-tight ${
              isDark ? "border-stone-900" : "border-stone-100"
            }`}>
              <Info className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <p>Double click directory folders to expand nodes, click text list nodes to edit.</p>
            </div>
          </div>

          {/* Sub-Col 2: Integrated File Content Editor Panel */}
          <div className="md:col-span-7 bg-stone-900 rounded-2xl p-4 border border-stone-800 flex flex-col text-left justify-between min-h-[360px]">
            {selectedFilePath ? (
              <div className="flex flex-col h-full justify-between space-y-4">
                
                {/* Editor File Meta info */}
                <div className="flex items-center justify-between border-b border-stone-850 pb-2">
                  <div className="min-w-0">
                    <span className="text-[8.5px] font-mono text-amber-500 uppercase tracking-wider block font-bold">Currently Editing</span>
                    <p className="text-xs font-mono font-semibold text-stone-200 truncate" title={selectedFilePath}>{selectedFilePath}</p>
                  </div>
                  <button 
                    onClick={() => handleDeleteFile(selectedFilePath)}
                    className="p-1 rounded text-stone-500 hover:text-rose-400 hover:bg-stone-850"
                    title="Delete File"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Main Text Area with JetBrains-Mono Style Code Editor */}
                <div className="flex-1 flex flex-col space-y-2">
                  <label className="text-[9px] font-mono text-stone-400 uppercase tracking-wider block">Plain-text / Code editor</label>
                  <textarea
                    value={editorContent}
                    onChange={(e) => setEditorContent(e.target.value)}
                    disabled={loadingFile || savingFile}
                    className="w-full h-44 p-3 bg-stone-950 text-emerald-400 font-mono text-[11px] rounded-xl border border-stone-800 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 resize-none leading-relaxed"
                  />
                  
                  {/* Preset Injectors */}
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    <span className="text-[8.5px] font-mono text-stone-500 uppercase tracking-widest block font-bold leading-none self-center mr-1">PRESETS:</span>
                    <button 
                      onClick={() => applyPreset("headline")}
                      className="text-[9px] font-mono bg-stone-850 text-stone-300 hover:bg-stone-800 px-2 py-0.5 rounded cursor-pointer select-none border border-stone-800 transition"
                    >
                      Headline
                    </button>
                    <button 
                      onClick={() => applyPreset("markdown")}
                      className="text-[9px] font-mono bg-stone-850 text-stone-300 hover:bg-stone-800 px-2 py-0.5 rounded cursor-pointer select-none border border-stone-800 transition"
                    >
                      Markdown list
                    </button>
                    <button 
                      onClick={() => applyPreset("image")}
                      className="text-[9px] font-mono bg-stone-850 text-stone-300 hover:bg-stone-800 px-2 py-0.5 rounded cursor-pointer select-none border border-stone-800 transition"
                    >
                      Image URL
                    </button>
                  </div>
                </div>

                {/* Editor Footer / Saving state */}
                <div className="flex items-center justify-between border-t border-stone-850 pt-2.5">
                  <div className="text-[10px]">
                    {editorContent !== originalContent ? (
                      <span className="text-amber-400 font-medium font-mono">● Unsaved edits</span>
                    ) : (
                      <span className="text-stone-500 font-mono">✓ Saved to server disk</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setEditorContent(originalContent)}
                      disabled={editorContent === originalContent || loadingFile || savingFile}
                      className="px-2.5 py-1.5 text-[10px] text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-md transition font-mono disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSaveFile}
                      disabled={loadingFile || savingFile}
                      className="px-4 py-1.5 rounded-lg bg-amber-600 text-stone-900 font-bold hover:bg-amber-500 text-[10px] uppercase font-mono tracking-wider flex items-center gap-1 select-none cursor-pointer disabled:opacity-40 transition"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {savingFile ? "Deploying..." : "Save & Feed Stack"}
                    </button>
                  </div>
                </div>

                {saveSuccess && (
                  <div className="mt-2 text-[10px] text-emerald-400 bg-emerald-900/20 border border-emerald-900/50 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Dynamic filesystem modified successfully. Entire spa stack fed instantly.</span>
                  </div>
                )}

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-20 text-stone-500 space-y-3">
                <FileCode className="w-10 h-10 text-stone-700 animate-pulse" />
                <div>
                  <p className="text-stone-300 font-bold text-xs font-mono">No Active File Selected</p>
                  <p className="text-[10px] text-stone-500 max-w-[200px] mt-1">Select any plain-text file in the folders tree on the left to edit and save dynamically.</p>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* RIGHT COLUMN: INTERACTIVE LIVE CLIENT PREVIEW SIMULATION (5/12 cols) */}
      <div className={`lg:col-span-6 p-5 flex flex-col justify-between space-y-4 transition-colors duration-200 ${
        isDark ? "bg-stone-950" : "bg-[#FAF9F6]"
      }`}>
        
        {/* Preview Control Headers */}
        <div className={`flex flex-col sm:flex-row shadow-inner sm:items-center justify-between gap-3 border-b pb-3 transition-colors ${
          isDark ? "border-stone-900" : "border-stone-200"
        }`}>
          <div className="text-left leading-none">
            <span className="text-[8px] uppercase tracking-[0.14em] text-stone-400 font-bold block">EXPERIENCE TESTBED</span>
            <span className={`text-sm font-bold font-display italic block mt-1 transition-colors ${
              isDark ? "text-stone-100" : "text-stone-850"
            }`}>Interactive Live Preview</span>
          </div>

          <div className="flex items-center gap-2">
            
            {/* Target Year/Month display coordinates selector */}
            <div className="flex items-center gap-1 font-mono">
              <span className="text-[9px] font-mono font-bold text-stone-400 uppercase">MONTH</span>
              <select 
                value={previewMonth} 
                onChange={(e) => {
                  setPreviewMonth(e.target.value);
                  loadLivePreview(previewYear, e.target.value);
                }}
                className={`px-2 py-1 text-[11px] rounded-md focus:outline-none font-mono font-bold transition ${
                  isDark 
                    ? "bg-stone-900 text-stone-100 border-stone-800" 
                    : "bg-white text-stone-700 border-stone-250"
                }`}
              >
                {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map(m => (
                  <option key={m} value={m} className={isDark ? "bg-stone-900 text-stone-150" : "bg-white text-stone-750"}>
                    {m} ({new Date(2026, parseInt(m) - 1).toLocaleString('default', { month: 'short' })})
                  </option>
                ))}
              </select>
            </div>

            {/* Viewport simulation state toggles */}
            <div className={`flex items-center border rounded-lg p-0.5 transition ${
              isDark ? "bg-stone-900 border-stone-800" : "bg-white border-stone-250"
            }`}>
              <button
                onClick={() => setPreviewDevice("mobile")}
                className={`p-1 rounded cursor-pointer transition ${
                  previewDevice === "mobile" 
                    ? (isDark ? "bg-amber-600 text-stone-950 font-bold" : "bg-stone-900 text-white") 
                    : "text-stone-400 hover:text-stone-750"
                }`}
                title="Simulate Mobile Device Mode"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPreviewDevice("desktop")}
                className={`p-1 rounded cursor-pointer transition ${
                  previewDevice === "desktop" 
                    ? (isDark ? "bg-amber-600 text-stone-950 font-bold" : "bg-stone-900 text-white") 
                    : "text-stone-400 hover:text-stone-750"
                }`}
                title="Simulate Large SPA Viewport Mode"
              >
                <Laptop className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </div>

        {/* Live Rendering Simulator */}
        <div className={`flex-1 flex items-center justify-center py-4 rounded-2xl relative overflow-hidden transition-colors ${
          isDark ? "bg-stone-900/40 border border-stone-900/60 shadow-inner" : "bg-stone-100 border border-stone-200 shadow-inner"
        }`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl"></div>
          
          {loadingPreview ? (
            <div className="text-center py-20 text-stone-400 font-mono text-xs">
              Re-referencing folder tree data...
            </div>
          ) : (
            
            /* Responsive simulated container wrapper */
            <div className={`transition-all duration-300 overflow-hidden relative border bg-[#F9F6F2] ${
              isDark ? "border-stone-800 shadow-[0_0_25px_rgba(0,0,0,0.45)]" : "border-stone-250 shadow-xl"
            } ${
              previewDevice === "mobile" 
                ? "w-[270px] h-[520px] rounded-[36px] border-[8px] border-stone-900 flex flex-col" 
                : "w-full max-w-[450px] h-[520px] rounded-2xl flex flex-col"
            }`}>
              
              {/* iPhone top sensor / notch detail if mobile preview */}
              {previewDevice === "mobile" && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-4.5 bg-stone-900 rounded-b-2xl z-30 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-stone-950 border border-stone-850 shrink-0"></div>
                  <div className="w-8 h-1 bg-stone-850 rounded-full ml-1 shrink-0"></div>
                </div>
              )}

              {/* Simulated Screen Body Content (Scrolled just like ClientPortal) */}
              <div className="flex-1 overflow-y-auto scrollbar-thin p-3 text-left space-y-4 pt-6">
                
                {/* Visual Mapping Highlight overlay if previewData is active */}
                <div className="p-2 border border-stone-200 bg-white/70 backdrop-blur-xs rounded-xl flex items-start gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping mt-1"></span>
                  <p className="text-[8px] text-stone-500 leading-tight">
                    <strong className="text-stone-800">Direct Reference Guide:</strong> Gold highlighters below correspond to fields automatically loaded and fed directly from files inside your active <code className="font-mono bg-stone-100 px-1 rounded">content/{previewYear}/{previewMonth}/</code> folder!
                  </p>
                </div>

                {/* Simulated Customer Home Hero Banner */}
                <div className="relative bg-[#EAE3DC] rounded-2xl p-4 overflow-hidden border border-[#DCD5CD] text-left">
                  
                  {/* Dynamic background loaded from pictures/hero-bg.txt */}
                  <div className="absolute right-[-10px] bottom-[-20px] w-24 h-28 border border-white border-[3px] bg-stone-200 shadow-lg overflow-hidden shrink-0 pill-mask rotate-6">
                    <img 
                      src={previewData.pictures["hero-bg.txt"] || "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80"} 
                      alt="Hero background" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex bg-amber-500 p-0.5 rounded-full scale-75" title="Fed from pictures/hero-bg.txt">
                      <span className="w-1 h-1 bg-white rounded-full"></span>
                    </div>
                  </div>

                  <div className="space-y-2 relative z-10 max-w-[150px]">
                    <span className="px-1.5 py-0.5 bg-stone-900 text-white text-[7px] uppercase tracking-widest rounded-md font-bold font-mono">BESPOKE SYSTEM</span>
                    
                    {/* Dynamic title from text/hero-title.txt */}
                    <div className="relative group/field border border-dashed border-amber-500/50 p-1 bg-amber-500/5 rounded-md">
                      <h4 className="font-serif text-sm font-semibold italic text-stone-850 leading-tight">
                        {previewData.text["hero-title.txt"] || "Sculpting Luxury At Your Fingertips"}
                      </h4>
                      <span className="absolute -top-2.5 -left-1 bg-amber-500 text-white text-[6px] px-1 rounded-sm uppercase tracking-wider font-mono font-bold scale-75 shadow-xs">text/hero-title.txt</span>
                    </div>

                    {/* Dynamic tagline from text/hero-subtitle.txt */}
                    <div className="relative group/field border border-dashed border-emerald-500/50 p-1 bg-emerald-500/5 rounded-md mt-1">
                      <p className="text-[8px] text-stone-500 leading-tight italic">
                        {previewData.text["hero-subtitle.txt"] || "Experience Russian-manicures customized beautifully to your unique beauty profile."}
                      </p>
                      <span className="absolute -top-2.5 -left-1 bg-emerald-500 text-white text-[6px] px-1 rounded-sm uppercase tracking-wider font-mono font-bold scale-75 shadow-xs">text/hero-subtitle.txt</span>
                    </div>

                  </div>
                </div>

                {/* Simulated Campaign Specials (Markdown Announcements) */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end border-b border-stone-200 pb-1 text-left">
                    <div>
                      <span className="text-[6.5px] uppercase tracking-wider text-amber-600 block font-bold">ORGANIC BROADCAST</span>
                      
                      {/* Dynamic campaign title from text/promo-title.txt */}
                      <div className="relative border border-dashed border-amber-500/40 p-1 rounded bg-amber-500/5">
                        <span className="absolute -top-2.5 -left-1 bg-amber-500 text-white text-[5px] px-1 rounded-xs font-mono font-bold scale-75 whitespace-nowrap">text/promo-title.txt</span>
                        <h4 className="text-xs font-bold font-serif italic text-stone-850 mt-0.5">
                          {previewData.text["promo-title.txt"] || "The Midnight Velvet Salon Soiree"}
                        </h4>
                      </div>
                    </div>

                    {/* Dynamic discount tag from text/promo-tag.txt */}
                    <div className="relative border border-dashed border-emerald-500/40 p-0.5 rounded bg-emerald-500/5 shrink-0 scale-90">
                      <span className="absolute -top-2.5 -right-1 bg-emerald-500 text-white text-[5px] px-1 rounded-xs font-mono font-bold scale-75 whitespace-nowrap">text/promo-tag.txt</span>
                      <span className="text-[7.5px] font-mono font-black uppercase text-stone-800">
                        {previewData.text["promo-tag.txt"] || "ACTIVE CAMPAIGN"}
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Body content rendered in Markdown from body/announcement.md */}
                  <div className="relative border border-dashed border-rose-500/50 p-3 bg-rose-500/5 rounded-xl text-left">
                    <span className="absolute -top-2.5 left-2 bg-rose-500 text-white text-[6px] px-1.5 py-0.5 rounded font-mono font-bold shadow-xs">body/announcement.md (MARKDOWN)</span>
                    <div className="text-[9px] text-stone-650 leading-relaxed max-w-full space-y-2 prose-headings:font-serif prose-headings:text-xs prose-headings:font-bold prose-headings:text-stone-850 prose-p:my-1 prose-ul:list-disc prose-ul:pl-3">
                      {previewData.body["announcement.md"] ? (
                        <ReactMarkdown>{previewData.body["announcement.md"]}</ReactMarkdown>
                      ) : (
                        <p className="italic text-stone-400">Initialize `body/announcement.md` inside your files folder tree to populate our live markdown bulletin board seamlessly.</p>
                      )}
                    </div>
                  </div>

                  {/* Welcoming Note under body/welcome-note.md */}
                  <div className="relative border border-dashed border-rose-500/30 p-2.5 bg-white rounded-xl text-left shadow-xs">
                    <span className="absolute -top-2.5 left-2 bg-rose-400 text-white text-[5.5px] px-1.5 py-0.5 rounded font-mono font-bold">body/welcome-note.md</span>
                    <div className="text-[8.5px] text-stone-500 italic leading-relaxed pt-1.5">
                      {previewData.body["welcome-note.md"] ? (
                        <ReactMarkdown>{previewData.body["welcome-note.md"]}</ReactMarkdown>
                      ) : (
                        <p className="text-stone-400">Welcome note placeholder file content empty.</p>
                      )}
                    </div>
                  </div>

                </div>

                {/* Promo Picture Image Card underneath pictures/promo-banner.txt */}
                <div className="space-y-1">
                  <span className="text-[6px] uppercase tracking-widest text-stone-400 block font-mono">Reference Gallery Media</span>
                  <div className="relative h-24 rounded-xl overflow-hidden border border-stone-200 bg-stone-100 shadow-xs">
                    <img 
                      src={previewData.pictures["promo-banner.txt"] || "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=600&q=80"} 
                      alt="Promo Banner representation" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-stone-900/30 flex items-center justify-center">
                      <span className="text-[8px] bg-stone-950/75 tracking-wider uppercase font-bold text-white px-2 py-1 rounded-md backdrop-blur-xs">Gallery reference check</span>
                    </div>
                    <span className="absolute bottom-1 right-1 bg-amber-500 text-white text-[5px] px-1 rounded-sm font-mono font-bold scale-75">pictures/promo-banner.txt</span>
                  </div>
                </div>

              </div>

              {/* Fake navigation buttons on simulator page */}
              <div className="bg-stone-900 text-stone-500 p-2 text-[7px] font-mono flex justify-around border-t border-stone-850 shrink-0 select-none">
                <span className="text-stone-300">● Design Home</span>
                <span>Services</span>
                <span>Products Catalog</span>
                <span>Online Booking</span>
              </div>

            </div>
          )}
        </div>

        {/* Live Simulator Status Bar */}
        <div className={`flex justify-between items-center rounded-xl p-3 text-[10px] text-stone-550 font-mono transition-colors duration-200 ${
          isDark ? "bg-stone-900/40 border border-stone-900" : "bg-stone-50 border border-stone-200"
        }`}>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <span>Target Endpoint: GET /api/monthly-content</span>
          </div>
          <div>
            <span>Mocking: Year {previewYear} Month {previewMonth}</span>
          </div>
        </div>

      </div>

    </div>
  );
}

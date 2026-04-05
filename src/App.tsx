/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Menu, 
  Trash2, 
  Settings, 
  Archive, 
  Star, 
  Moon, 
  Sun,
  LayoutGrid,
  List as ListIcon,
  Filter,
  ArrowUpDown,
  MoreVertical,
  Share2,
  Pin,
  Lock,
  Mic,
  Sparkles,
  ChevronLeft,
  X,
  Check,
  Type as TypeIcon,
  FileText,
  Palette
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Note, NoteCategory, SortOption } from './types';
import { generateNoteTitle, summarizeNote, correctGrammar } from './lib/gemini';

const CATEGORIES: NoteCategory[] = ['General', 'Work', 'Personal', 'Ideas'];
const CATEGORY_COLORS: Record<NoteCategory, string> = {
  General: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  Work: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  Personal: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
  Ideas: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
};

export default function App() {
  // State
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('droidnotes');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<NoteCategory | 'All'>('All');
  const [sortOption, setSortOption] = useState<SortOption>('pinned');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showTrash, setShowTrash] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [lockPin, setLockPin] = useState('');
  const [isLockDialogOpen, setIsLockDialogOpen] = useState(false);
  const [pendingLockId, setPendingLockId] = useState<string | null>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('droidnotes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Derived State
  const filteredNotes = useMemo(() => {
    let result = notes.filter(n => n.isDeleted === showTrash);
    
    if (selectedCategory !== 'All') {
      result = result.filter(n => n.category === selectedCategory);
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n => 
        n.title.toLowerCase().includes(q) || 
        n.content.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => {
      if (sortOption === 'pinned') {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.updatedAt - a.updatedAt;
      }
      if (sortOption === 'updated') return b.updatedAt - a.updatedAt;
      if (sortOption === 'created') return b.createdAt - a.createdAt;
      if (sortOption === 'title') return a.title.localeCompare(b.title);
      return 0;
    });
  }, [notes, searchQuery, selectedCategory, sortOption, showTrash]);

  const activeNote = notes.find(n => n.id === activeNoteId);

  // Handlers
  const createNote = () => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: '',
      content: '',
      category: 'General',
      isPinned: false,
      isLocked: false,
      isDeleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
    setShowTrash(false);
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n));
  };

  const deleteNote = (id: string) => {
    if (showTrash) {
      // Permanent delete
      setNotes(prev => prev.filter(n => n.id !== id));
    } else {
      // Move to trash
      updateNote(id, { isDeleted: true, isPinned: false });
    }
    if (activeNoteId === id) setActiveNoteId(null);
  };

  const restoreNote = (id: string) => {
    updateNote(id, { isDeleted: false });
  };

  const handleAiAutoTitle = async () => {
    if (!activeNote || !activeNote.content.trim()) return;
    setIsAiLoading(true);
    const title = await generateNoteTitle(activeNote.content);
    updateNote(activeNote.id, { title });
    setIsAiLoading(false);
  };

  const handleAiSummarize = async () => {
    if (!activeNote || !activeNote.content.trim()) return;
    setIsAiLoading(true);
    const summary = await summarizeNote(activeNote.content);
    updateNote(activeNote.id, { content: activeNote.content + "\n\n--- Summary ---\n" + summary });
    setIsAiLoading(false);
  };

  const handleAiCorrect = async () => {
    if (!activeNote || !activeNote.content.trim()) return;
    setIsAiLoading(true);
    const corrected = await correctGrammar(activeNote.content);
    updateNote(activeNote.id, { content: corrected });
    setIsAiLoading(false);
  };

  const handleShare = async (note: Note) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: note.title || 'Note',
          text: note.content,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(`${note.title}\n\n${note.content}`);
      alert('Note copied to clipboard!');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeNote) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        updateNote(activeNote.id, { images: [...(activeNote.images || []), base64] });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (index: number) => {
    if (activeNote) {
      const newImages = [...(activeNote.images || [])];
      newImages.splice(index, 1);
      updateNote(activeNote.id, { images: newImages });
    }
  };

  const handleLockToggle = (id: string) => {
    const note = notes.find(n => n.id === id);
    if (note?.isLocked) {
      // Unlock: ask for PIN
      const pin = prompt("Enter PIN to unlock:");
      if (pin === note.password) {
        updateNote(id, { isLocked: false });
      } else {
        alert("Incorrect PIN");
      }
    } else {
      // Lock: set PIN
      setPendingLockId(id);
      setIsLockDialogOpen(true);
    }
  };

  const confirmLock = () => {
    if (pendingLockId && lockPin) {
      updateNote(pendingLockId, { isLocked: true, password: lockPin });
      setIsLockDialogOpen(false);
      setLockPin('');
      setPendingLockId(null);
    }
  };

  const handleVoiceToText = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (activeNote) {
        updateNote(activeNote.id, { content: activeNote.content + " " + transcript });
      }
    };
    recognition.start();
  };

  return (
    <div className={`min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300`}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
            <FileText size={24} />
            DroidNote
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-full text-sm focus:ring-2 focus:ring-indigo-500 w-48 md:w-64 transition-all"
            />
          </div>
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Sidebar Overlay */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="absolute inset-0 z-50 bg-black/20 backdrop-blur-sm"
              />
              <motion.aside 
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                className="absolute inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 shadow-2xl border-r border-slate-200 dark:border-slate-800 flex flex-col"
              >
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="font-bold text-lg">Menu</span>
                  <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                    <X size={20} />
                  </button>
                </div>
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                  <button 
                    onClick={() => { setShowTrash(false); setSelectedCategory('All'); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${!showTrash && selectedCategory === 'All' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                    <FileText size={20} />
                    <span className="font-medium">All Notes</span>
                  </button>
                  <div className="pt-4 pb-2 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Categories</div>
                  {CATEGORIES.map(cat => (
                    <button 
                      key={cat}
                      onClick={() => { setSelectedCategory(cat); setShowTrash(false); setIsSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${selectedCategory === cat ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                      <div className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[cat].split(' ')[0]}`} />
                      <span className="font-medium">{cat}</span>
                    </button>
                  ))}
                  <div className="pt-4 pb-2 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">System</div>
                  <button 
                    onClick={() => { setShowTrash(true); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${showTrash ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                    <Trash2 size={20} />
                    <span className="font-medium">Trash</span>
                  </button>
                </nav>
                <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                  <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500">
                    <Settings size={20} />
                    <span className="font-medium">Settings</span>
                  </button>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Note List / Editor Container */}
        <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
          {/* List Section */}
          <section className={`flex-1 flex flex-col h-full ${activeNoteId ? 'hidden md:flex' : 'flex'} md:max-w-md lg:max-w-lg border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900`}>
            <div className="p-4 flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500"
                  title="Toggle View"
                >
                  {viewMode === 'grid' ? <ListIcon size={18} /> : <LayoutGrid size={18} />}
                </button>
                <div className="relative">
                  <select 
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as SortOption)}
                    className="appearance-none bg-slate-100 dark:bg-slate-800 border-none rounded-lg py-2 pl-3 pr-8 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="pinned">Pinned First</option>
                    <option value="updated">Last Updated</option>
                    <option value="created">Date Created</option>
                    <option value="title">Title A-Z</option>
                  </select>
                  <ArrowUpDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
                </div>
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {filteredNotes.length} Notes
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {filteredNotes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 opacity-60">
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-full">
                    <FileText size={48} />
                  </div>
                  <p className="font-medium">No notes found</p>
                </div>
              ) : (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-3' : 'space-y-3'}>
                  {filteredNotes.map(note => (
                    <motion.div 
                      layout
                      key={note.id}
                      onClick={() => setActiveNoteId(note.id)}
                      className={`group relative p-4 rounded-2xl cursor-pointer transition-all duration-200 border-2 ${activeNoteId === note.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500' : 'bg-slate-50 dark:bg-slate-800/40 border-transparent hover:border-slate-200 dark:hover:border-slate-700'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${CATEGORY_COLORS[note.category]}`}>
                          {note.category}
                        </span>
                        <div className="flex items-center gap-1">
                          {note.isPinned && <Pin size={14} className="text-indigo-500 fill-indigo-500" />}
                          {note.isLocked && <Lock size={14} className="text-slate-400" />}
                        </div>
                      </div>
                      <h3 className="font-bold text-base mb-1 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {note.title || 'Untitled Note'}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                        {note.content || 'No content...'}
                      </p>
                      <div className="flex items-center justify-between text-[10px] font-medium text-slate-400">
                        <span>{new Date(note.updatedAt).toLocaleDateString()} • {new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 rounded-full transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Editor Section */}
          <section className={`flex-1 flex flex-col h-full bg-white dark:bg-slate-950 ${!activeNoteId ? 'hidden md:flex' : 'flex'}`}>
            {activeNote ? (
              <>
                {/* Editor Toolbar */}
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setActiveNoteId(null)}
                      className="md:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button 
                      onClick={() => updateNote(activeNote.id, { isPinned: !activeNote.isPinned })}
                      className={`p-2 rounded-full transition-colors ${activeNote.isPinned ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'}`}
                    >
                      <Pin size={20} className={activeNote.isPinned ? 'fill-indigo-500' : ''} />
                    </button>
                    <button 
                      onClick={() => handleLockToggle(activeNote.id)}
                      className={`p-2 rounded-full transition-colors ${activeNote.isLocked ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/30' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'}`}
                    >
                      <Lock size={20} />
                    </button>
                    <div className="h-6 w-px bg-slate-200 dark:border-slate-800 mx-1" />
                    <label className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 cursor-pointer">
                      <Palette size={20} />
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleImageUpload} 
                      />
                    </label>
                    <button 
                      onClick={handleVoiceToText}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
                      title="Voice to Text"
                    >
                      <Mic size={20} />
                    </button>
                    <button 
                      onClick={() => handleShare(activeNote)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
                      title="Share"
                    >
                      <Share2 size={20} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-full">
                      {isAiLoading ? (
                        <div className="px-3 py-1 flex items-center gap-2 text-xs font-bold text-indigo-500 animate-pulse">
                          <Sparkles size={14} className="animate-spin" />
                          AI Thinking...
                        </div>
                      ) : (
                        <>
                          <button 
                            onClick={handleAiAutoTitle}
                            className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-all text-indigo-600 dark:text-indigo-400"
                            title="AI Auto Title"
                          >
                            <TypeIcon size={16} />
                          </button>
                          <button 
                            onClick={handleAiSummarize}
                            className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-all text-indigo-600 dark:text-indigo-400"
                            title="AI Summarize"
                          >
                            <Sparkles size={16} />
                          </button>
                          <button 
                            onClick={handleAiCorrect}
                            className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-all text-indigo-600 dark:text-indigo-400"
                            title="AI Grammar Fix"
                          >
                            <Check size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Editor Content */}
                <div className="flex-1 flex flex-col p-6 md:p-10 overflow-y-auto custom-scrollbar">
                  <div className="max-w-3xl mx-auto w-full space-y-6">
                    <div className="flex items-center gap-3">
                      <select 
                        value={activeNote.category}
                        onChange={(e) => updateNote(activeNote.id, { category: e.target.value as NoteCategory })}
                        className={`text-xs font-bold px-3 py-1 rounded-full border-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-colors ${CATEGORY_COLORS[activeNote.category]}`}
                      >
                        {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                      <span className="text-xs font-medium text-slate-400">
                        Edited {new Date(activeNote.updatedAt).toLocaleString()}
                      </span>
                    </div>

                    <input 
                      type="text"
                      placeholder="Title"
                      value={activeNote.title}
                      onChange={(e) => updateNote(activeNote.id, { title: e.target.value })}
                      className="w-full text-3xl md:text-4xl font-black bg-transparent border-none focus:ring-0 placeholder:text-slate-200 dark:placeholder:text-slate-800 transition-all"
                    />

                    {activeNote.images && activeNote.images.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {activeNote.images.map((img, idx) => (
                          <div key={idx} className="relative group rounded-2xl overflow-hidden shadow-lg">
                            <img src={img} alt="Note attachment" className="w-full h-48 object-cover" referrerPolicy="no-referrer" />
                            <button 
                              onClick={() => removeImage(idx)}
                              className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <textarea 
                      placeholder="Start typing your thoughts..."
                      value={activeNote.content}
                      onChange={(e) => updateNote(activeNote.id, { content: e.target.value })}
                      className="w-full flex-1 min-h-[400px] text-lg md:text-xl bg-transparent border-none focus:ring-0 resize-none placeholder:text-slate-200 dark:placeholder:text-slate-800 leading-relaxed custom-scrollbar"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-800 p-10 select-none">
                <div className="relative mb-8">
                  <div className="absolute -inset-4 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-2xl animate-pulse" />
                  <FileText size={120} className="relative" />
                </div>
                <h2 className="text-2xl font-bold mb-2 text-slate-400 dark:text-slate-700">Select a note to view</h2>
                <p className="text-slate-400 dark:text-slate-700 max-w-xs text-center">
                  Choose a note from the list or create a new one to get started.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Floating Action Button */}
      <motion.button 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={createNote}
        className="fixed bottom-8 right-8 w-16 h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-xl shadow-indigo-500/30 flex items-center justify-center z-30 transition-colors"
      >
        <Plus size={32} strokeWidth={3} />
      </motion.button>

      {/* Trash Banner */}
      {showTrash && (
        <div className="bg-red-500 text-white px-4 py-2 text-center text-sm font-bold flex items-center justify-center gap-2">
          <Trash2 size={16} />
          Viewing Trash - Notes here will be permanently deleted
          <button 
            onClick={() => {
              setNotes(prev => prev.filter(n => !n.isDeleted));
              setShowTrash(false);
            }}
            className="ml-4 underline hover:no-underline"
          >
            Empty Trash
          </button>
        </div>
      )}

      {/* Lock Dialog */}
      <AnimatePresence>
        {isLockDialogOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsLockDialogOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full">
                  <Lock size={32} />
                </div>
                <h2 className="text-xl font-bold">Lock Note</h2>
                <p className="text-sm text-slate-500">Set a 4-digit PIN to protect this note.</p>
                <input 
                  type="password" 
                  maxLength={4}
                  value={lockPin}
                  onChange={(e) => setLockPin(e.target.value.replace(/\D/g, ''))}
                  className="w-32 text-center text-2xl tracking-[1em] font-bold py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
                <div className="flex gap-3 w-full pt-4">
                  <button 
                    onClick={() => setIsLockDialogOpen(false)}
                    className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmLock}
                    disabled={lockPin.length < 4}
                    className="flex-1 py-3 font-bold bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    Lock
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}</style>
    </div>
  );
}

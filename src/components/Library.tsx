import React from "react";
import { BookOpen, X, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import type { Word, Collection } from "../data/words";

interface LibraryProps {
  isOpen: boolean;
  collections: Collection[];
  dominantColor: { r: number; g: number; b: number };
  onDeleteWord: (collectionId: string, wordIndex: number) => void;
  onDeleteCollection: (collectionId: string) => void;
  onClearAll: () => void;
}

export default function Library({
  isOpen,
  collections,
  dominantColor,
  onDeleteWord,
  onDeleteCollection,
  onClearAll,
}: LibraryProps) {
  const [expandedCollections, setExpandedCollections] = React.useState<Set<string>>(new Set());

  const toggleCollection = (id: string) => {
    const next = new Set(expandedCollections);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedCollections(next);
  };

  const totalWords = collections.reduce((acc, c) => acc + c.words.length, 0);

  return (
    <div
      className={`h-full border-r border-white/10 overflow-y-auto transition-all duration-500 ease-in-out flex flex-col ${
        isOpen
          ? "w-[300px] opacity-100 p-6"
          : "w-0 opacity-0 p-0 overflow-hidden border-none"
      }`}
      style={{
        backgroundColor: `rgba(${dominantColor.r}, ${dominantColor.g}, ${dominantColor.b}, 0.25)`,
        backdropFilter: "blur(24px)",
      }}
    >
      <div className="min-w-[250px]">
        <div className="flex items-center justify-between mb-6 text-white">
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-emerald-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider">
              單字題庫 ({totalWords})
            </h3>
          </div>
          {collections.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-[10px] bg-red-500/20 hover:bg-red-500/40 text-red-400 px-2 py-1 rounded-md transition-colors"
            >
              清空
            </button>
          )}
        </div>

        <div className="space-y-4 custom-scrollbar">
          {collections.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 text-xs">
              目前沒有單字，請從設定中匯入。
            </div>
          ) : (
            collections.map((collection) => (
              <div key={collection.id} className="space-y-2">
                <div className="flex items-center justify-between group">
                  <button
                    onClick={() => toggleCollection(collection.id)}
                    className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
                  >
                    {expandedCollections.has(collection.id) ? (
                      <ChevronDown size={14} className="text-emerald-400" />
                    ) : (
                      <ChevronRight size={14} className="text-emerald-400" />
                    )}
                    <span className="text-xs font-bold truncate max-w-[150px]">
                      {collection.name} ({collection.words.length})
                    </span>
                  </button>
                  <button
                    onClick={() => onDeleteCollection(collection.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-500 hover:text-red-400"
                    title="刪除整個資料夾"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                {expandedCollections.has(collection.id) && (
                  <div className="space-y-2 pl-4 border-l border-white/5 ml-1.5">
                    {collection.words.map((word, i) => (
                      <div
                        key={i}
                        className="p-3 bg-black/40 rounded-xl border border-white/5 text-[11px] group relative"
                      >
                        <button
                          onClick={() => onDeleteWord(collection.id, i)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-500 hover:text-red-400"
                        >
                          <X size={10} />
                        </button>
                        <div className="flex justify-between items-start mb-1 pr-4">
                          <span className="font-bold text-amber-200 text-sm">
                            {word.kanji}
                          </span>
                        </div>
                        <div className="text-zinc-400">
                          {word.reading} · {word.meaning}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

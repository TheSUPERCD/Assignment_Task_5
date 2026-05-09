import React, { useState, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Trash2, Edit2, CheckSquare, Type, CornerDownRight, Save, LayoutList, Moon, Sun, ChevronRight, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';

const generateId = () => Math.random().toString(36).substr(2, 9);

const buildTree = (questions, parentId = null, prefix = '') => {
  return questions
    .filter((q) => q.parentId === parentId)
    .sort((a, b) => a.order - b.order)
    .map((q, index) => {
      const currentNumber = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
      return {
        ...q,
        number: currentNumber,
        children: buildTree(questions, q.id, currentNumber),
      };
    });
};

const getDescendantIds = (questions, parentId) => {
  let ids = [];
  const children = questions.filter((q) => q.parentId === parentId);
  for (const child of children) {
    ids.push(child.id);
    ids = ids.concat(getDescendantIds(questions, child.id));
  }
  return ids;
};

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? savedTheme === 'dark' : true;
  });

  const [questions, setQuestions] = useState(() => {
    const saved = localStorage.getItem('form_questions');
    return saved ? JSON.parse(saved) : [];
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('form_questions', JSON.stringify(questions));
  }, [questions]);

  const tree = useMemo(() => buildTree(questions), [questions]);

  const addQuestion = (parentId = null) => {
    const siblings = questions.filter((q) => q.parentId === parentId);
    const newQuestion = {
      id: generateId(),
      parentId,
      text: '',
      type: 'short_answer',
      order: siblings.length,
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (id, updates) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const deleteQuestion = (id) => {
    const idsToRemove = new Set([id, ...getDescendantIds(questions, id)]);
    setQuestions(questions.filter((q) => !idsToRemove.has(q.id)));
  };

  const moveQuestion = (id, direction) => {
    const target = questions.find(q => q.id === id);
    if (!target) return;

    const siblings = questions.filter(q => q.parentId === target.parentId).sort((a,b) => a.order - b.order);
    const index = siblings.findIndex(q => q.id === id);

    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === siblings.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    const newSiblings = [...siblings];
    [newSiblings[index], newSiblings[newIndex]] = [newSiblings[newIndex], newSiblings[index]];

    setQuestions(prev => prev.map(q => {
      if (q.parentId === target.parentId) {
        const newOrder = newSiblings.findIndex(s => s.id === q.id);
        return { ...q, order: newOrder };
      }
      return q;
    }));
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination } = result;

    const parentId = source.droppableId === 'root-questions' ? null : source.droppableId;

    const siblings = questions
      .filter((q) => q.parentId === parentId)
      .sort((a, b) => a.order - b.order);

    const [moved] = siblings.splice(source.index, 1);
    siblings.splice(destination.index, 0, moved);

    const updatedSiblings = siblings.map((sib, index) => ({
      ...sib,
      order: index,
    }));

    setQuestions((prev) =>
      prev.map((q) => {
        const updated = updatedSiblings.find((s) => s.id === q.id);
        return updated ? updated : q;
      })
    );
  };

  const renderBuilderNode = (node, index, isRoot = false) => {
    const siblingsCount = questions.filter(q => q.parentId === node.parentId).length;
    const isFirst = index === 0;
    const isLast = index === siblingsCount - 1;

    return (
      <Draggable key={node.id} draggableId={node.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`w-full ${snapshot.isDragging ? 'opacity-80 z-50 relative' : ''}`}
          >
            <div className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-zinc-800 transition-colors shadow-sm relative flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              
              {/* Drag Handle */}
              <div 
                {...provided.dragHandleProps} 
                className="text-slate-400 dark:text-zinc-600 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-grab active:cursor-grabbing p-1"
                title="Drag to reorder"
              >
                <GripVertical size={20} />
              </div>

              <div className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-1 rounded border border-indigo-100 dark:border-indigo-900/50">
                Q{node.number}
              </div>
              
              <div className="flex-1 w-full flex flex-col xl:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Type your question here..."
                  value={node.text}
                  onChange={(e) => updateQuestion(node.id, { text: e.target.value })}
                  className="flex-1 min-w-[200px] p-1.5 border-b-2 border-slate-100 dark:border-zinc-800 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none text-slate-800 dark:text-zinc-100 font-medium bg-transparent transition-colors"
                />
                
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={node.type}
                    onChange={(e) => updateQuestion(node.id, { type: e.target.value })}
                    className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-zinc-200"
                  >
                    <option value="short_answer">Short Answer</option>
                    <option value="true_false">True/False</option>
                  </select>

                  {node.type === 'true_false' && (
                    <button
                      onClick={() => addQuestion(node.id)}
                      className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 px-2 py-1 rounded transition-colors"
                    >
                      <Plus size={14} /> Add New Child Question (IFF Answer is True)
                    </button>
                  )}
                </div>
              </div>

              {/* Actions Area: Arrows & Trash */}
              <div className="flex items-center gap-1 self-end sm:self-auto bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-1">
                <button
                  onClick={() => moveQuestion(node.id, 'up')}
                  disabled={isFirst}
                  className={`p-1.5 rounded ${isFirst ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-200 dark:hover:bg-zinc-800'} text-slate-500 dark:text-zinc-400`}
                  title="Move Up"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  onClick={() => moveQuestion(node.id, 'down')}
                  disabled={isLast}
                  className={`p-1.5 rounded ${isLast ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-200 dark:hover:bg-zinc-800'} text-slate-500 dark:text-zinc-400`}
                  title="Move Down"
                >
                  <ArrowDown size={16} />
                </button>
                <div className="w-px h-4 bg-slate-300 dark:bg-zinc-700 mx-1"></div>
                <button
                  onClick={() => deleteQuestion(node.id)}
                  className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  title="Delete Question"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Render nested children inside a unique Droppable tied to this parent's ID */}
            {node.children.length > 0 && (
              <Droppable droppableId={node.id} type={node.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="pl-6 sm:pl-10 mt-3 space-y-3 relative before:absolute before:left-3 sm:before:left-5 before:top-0 before:bottom-0 before:w-px before:bg-indigo-200 dark:before:bg-zinc-700"
                  >
                    {node.children.map((child, childIndex) => renderBuilderNode(child, childIndex, false))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            )}
          </div>
        )}
      </Draggable>
    );
  };

  const renderFileTreeNode = (node) => (
    <div key={node.id} className="relative pl-6 pt-3">
      <div className="absolute top-7 left-0 w-5 border-t-2 border-slate-300 dark:border-zinc-700"></div>
      <div className="absolute top-0 bottom-0 left-0 border-l-2 border-slate-300 dark:border-zinc-700 last:bottom-auto last:h-7"></div>
      
      <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 p-3 border border-slate-200 dark:border-zinc-800 rounded w-fit max-w-full overflow-hidden shadow-sm">
        <ChevronRight size={16} className="text-slate-400 dark:text-zinc-600 shrink-0" />
        <span className="font-mono text-xs font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded">
          Q{node.number}
        </span>
        <span className="text-slate-800 dark:text-zinc-200 font-medium truncate max-w-[150px] sm:max-w-md">
          {node.text || <span className="italic text-slate-400 dark:text-zinc-500">Untitled</span>}
        </span>
        
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-950 px-2 py-1 rounded text-xs text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800">
          {node.type === 'short_answer' ? <Type size={12} /> : <CheckSquare size={12} />}
          <span>{node.type === 'short_answer' ? 'Text' : 'T/F'}</span>
        </div>

        <button 
          onClick={() => setIsSubmitted(false)}
          className="ml-2 text-slate-400 hover:text-indigo-600 dark:text-zinc-500 dark:hover:text-indigo-400 transition-colors"
          title="Edit Node"
        >
          <Edit2 size={14} />
        </button>
      </div>
      
      {node.children.length > 0 && (
        <div className="mt-1 ml-4">
          {node.children.map(renderFileTreeNode)}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 transition-colors duration-200 p-4 sm:p-8 md:p-12 font-sans selection:bg-indigo-500/30">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Area */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 pb-6 border-b border-slate-200 dark:border-zinc-800 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3 tracking-tight">
              <LayoutList className="text-indigo-600 dark:text-indigo-500" /> 
              Nested Form: Task-5
            </h1>
            <p className="text-slate-500 dark:text-zinc-500 mt-1 text-sm sm:text-base">A ReactJS + Vite Implementation Of Task-5 With All Bonus Features.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors"
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              onClick={() => setIsSubmitted(!isSubmitted)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all border shadow-sm ${
                isSubmitted 
                ? 'bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border-transparent hover:bg-slate-300 dark:hover:bg-zinc-700' 
                : 'bg-indigo-600 text-white border-transparent hover:bg-indigo-700 shadow-indigo-200 dark:shadow-none'
              }`}
            >
              {isSubmitted ? <><Edit2 size={16} /> Edit Form</> : <><Save size={16} /> Submit Form</>}
            </button>
          </div>
        </div>

        {/* Dynamic Editing-Mode View */}
        {!isSubmitted && (
          <div className="space-y-6 pb-24">
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="root-questions" type="root-questions">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                    {tree.map((node, index) => renderBuilderNode(node, index, true))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {tree.length === 0 && (
              <div className="text-center py-16 bg-white dark:bg-zinc-900/50 border-2 border-dashed border-slate-300 dark:border-zinc-800 rounded-xl">
                <p className="text-slate-500 dark:text-zinc-500">Workspace empty. Create a new question for the form below.</p>
              </div>
            )}

            <button
              onClick={() => addQuestion(null)}
              className="flex items-center justify-center sm:justify-start gap-2 text-indigo-600 dark:text-indigo-400 font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-950/50 px-5 py-3 rounded-xl transition-colors w-full sm:w-auto border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/50"
            >
              <Plus size={20} /> Add New Question
            </button>
          </div>
        )}

        {/* Submitted Tree View */}
        {isSubmitted && (
          <div className="bg-slate-50 dark:bg-zinc-950 p-4 sm:p-8 rounded-xl border border-slate-200 dark:border-zinc-800 overflow-x-auto shadow-inner">
            <h2 className="text-lg font-bold mb-6 text-slate-800 dark:text-zinc-200 flex items-center gap-2">
              <CornerDownRight className="text-indigo-500" /> Tree View Of All Submitted Questions
            </h2>
            {tree.length === 0 ? (
              <p className="text-slate-500 dark:text-zinc-600 italic">No questions configured!</p>
            ) : (
              <div className="font-mono text-sm ml-2">
                {tree.map(renderFileTreeNode)}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

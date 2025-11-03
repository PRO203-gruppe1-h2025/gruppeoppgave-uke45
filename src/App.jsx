// src/App.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { preserveOffsetOnSource } from '@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source';
import { v4 as uuidv4 } from 'uuid';
import './App.css';

const initialColumns = {
  backlog: { title: 'Backlog', items: [] },
  ready: { title: 'Ready', items: [] },
  inprogress: { title: 'In Progress', items: [] },
  inreview: { title: 'In Review', items: [] },
  done: { title: 'Done', items: [] },
};

export default function App() {
  const [columns, setColumns] = useState(initialColumns);
  const [newTask, setNewTask] = useState('');

  const addTask = () => {
    if (!newTask.trim()) return;
    const task = { id: uuidv4(), content: newTask };
    setColumns((c) => ({
      ...c,
      backlog: { ...c.backlog, items: [...c.backlog.items, task] },
    }));
    setNewTask('');
  };

  return (
    <div className="app">
      <h1>Kanban Board</h1>

      <div className="add-task">
        <input
          placeholder="New task..."
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
        />
        <button onClick={addTask}>Add</button>
      </div>

      <KanbanBoard columns={columns} setColumns={setColumns} />
    </div>
  );
}
    

/* --------------------------------------------------------------
   Global monitor – ONE per app
   -------------------------------------------------------------- */
function KanbanBoard({ columns, setColumns }) {
  useEffect(() => {
    return monitorForElements({
      onDrop({ location, source }) {
        const destination = location.current.dropTargets[0];
        if (!destination) return; // dropped outside any column

        const srcColId = source.data.columnId;
        const destColId = destination.data.columnId;
        const srcIndex = source.data.index;

        // Find the exact index where the card was dropped
        const destEl = destination.element;
        const destChildren = Array.from(destEl.children);
        const destIndex = destChildren.findIndex((el) => el === source.element) + 1;
        const finalIndex = destIndex === -1 ? destEl.children.length : destIndex;

        // Clone data
        const srcItems = [...columns[srcColId].items];
        const dstItems = srcColId === destColId ? srcItems : [...columns[destColId].items];
        const [moved] = srcItems.splice(srcIndex, 1);
        dstItems.splice(finalIndex, 0, moved);

        setColumns({
          ...columns,
          [srcColId]: { ...columns[srcColId], items: srcItems },
          ...(srcColId !== destColId && { [destColId]: { ...columns[destColId], items: dstItems } }),
        });
      },
    });
  }, [columns, setColumns]);

  return (
    <div className="kanban-board">
      {Object.entries(columns).map(([colId, col]) => (
        <Column key={colId} columnId={colId} title={col.title} items={col.items} />
      ))}
    </div>
  );
}

/* --------------------------------------------------------------
   Column – drop target
   -------------------------------------------------------------- */
function Column({ columnId, title, items }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    return dropTargetForElements({
      element: el,
      getData: () => ({ columnId }),
      onDragEnter: () => el.classList.add('dropping'),
      onDragLeave: () => el.classList.remove('dropping'),
      onDrop: () => el.classList.remove('dropping'),
    });
  }, [columnId]);

  return (
    <div className="column">
      <h3>{title}</h3>
      <div ref={ref} className="task-list">
        {items.map((task, idx) => (
          <Task key={task.id} task={task} index={idx} columnId={columnId} />
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------
   Task – draggable
   -------------------------------------------------------------- */
function Task({ task, index, columnId }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    return draggable({
      element: el,
      getInitialData: () => ({ taskId: task.id, columnId, index }),
      onGenerateDragPreview: ({ nativeSetDragImage }) => {
        preserveOffsetOnSource({ element: el, nativeSetDragImage });
      },
    });
  }, [task.id, columnId, index]);

  return (
    <div ref={ref} className="task-card">
      <span className="task-content-highlight">
        {task.content}
      </span>
    </div>
  );
}

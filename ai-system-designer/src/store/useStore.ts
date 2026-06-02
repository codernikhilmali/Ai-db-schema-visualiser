import { create } from 'zustand';
import { 
  type Connection, 
  type Edge, 
  type EdgeChange, 
  type Node, 
  type NodeChange, 
  addEdge, 
  applyNodeChanges, 
  applyEdgeChanges 
} from 'reactflow';
import { parseERSchema } from '../utils/erParser';
import { applyElkLayout } from '../utils/elkLayout';

export interface FocusedColumn {
  nodeId: string;
  colName: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
  jsonSchema: string;
  sqlSchema: string;
}

interface DiagramState {
  projects: Project[];
  activeProjectId: string;
  nodes: Node[];
  edges: Edge[];
  jsonSchema: string;
  sqlSchema: string;
  theme: 'dark' | 'light';
  focusedColumn: FocusedColumn | null;
  focusedEdge: string | null;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setJsonSchema: (schema: string) => void;
  setSqlSchema: (schema: string) => void;
  updateFromJSON: (schema: string) => void;
  syncJSONFromCanvas: () => void;
  setFocusedColumn: (col: FocusedColumn | null) => void;
  setFocusedEdge: (edgeId: string | null) => void;
  toggleTheme: () => void;
  
  // AI related states
  aiThinkingStep: string | null;
  setAiThinkingStep: (step: string | null) => void;
  healthScore: number;
  setHealthScore: (score: number) => void;
  isAIPanelOpen: boolean;
  setIsAIPanelOpen: (open: boolean) => void;
  pendingPrompt: string | null;
  setPendingPrompt: (prompt: string | null) => void;

  // Layout
  layoutVersion: number;
  autoLayout: () => Promise<void>;

  // Multi-project actions
  addProject: (name: string, description: string) => void;
  switchProject: (id: string) => void;
  removeProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
}

const initialERSchema = {
  "users": {
    "columns": [
      { "name": "id", "type": "UUID", "isPrimary": true, "isForeignKey": false, "isNotNull": true, "isUnique": false },
      { "name": "username", "type": "VARCHAR(255)", "isPrimary": false, "isForeignKey": false, "isNotNull": true, "isUnique": true },
      { "name": "email", "type": "VARCHAR(255)", "isPrimary": false, "isForeignKey": false, "isNotNull": true, "isUnique": true },
      { "name": "password_hash", "type": "VARCHAR(255)", "isPrimary": false, "isForeignKey": false, "isNotNull": true, "isUnique": false },
      { "name": "first_name", "type": "VARCHAR(255)", "isPrimary": false, "isForeignKey": false, "isNotNull": false, "isUnique": false },
      { "name": "last_name", "type": "VARCHAR(255)", "isPrimary": false, "isForeignKey": false, "isNotNull": false, "isUnique": false },
      { "name": "address", "type": "VARCHAR(255)", "isPrimary": false, "isForeignKey": false, "isNotNull": false, "isUnique": false },
      { "name": "city", "type": "VARCHAR(255)", "isPrimary": false, "isForeignKey": false, "isNotNull": false, "isUnique": false },
      { "name": "state", "type": "VARCHAR(255)", "isPrimary": false, "isForeignKey": false, "isNotNull": false, "isUnique": false },
      { "name": "zip_code", "type": "VARCHAR(20)", "isPrimary": false, "isForeignKey": false, "isNotNull": false, "isUnique": false },
      { "name": "phone_number", "type": "VARCHAR(20)", "isPrimary": false, "isForeignKey": false, "isNotNull": false, "isUnique": false },
      { "name": "created_at", "type": "TIMESTAMP", "isPrimary": false, "isForeignKey": false, "isNotNull": true, "isUnique": false },
      { "name": "updated_at", "type": "TIMESTAMP", "isPrimary": false, "isForeignKey": false, "isNotNull": true, "isUnique": false }
    ],
    "position": { "x": 1040, "y": 574 }
  },
  "categories": {
    "columns": [
      { "name": "id", "type": "UUID", "isPrimary": true, "isForeignKey": false, "isNotNull": true, "isUnique": false },
      { "name": "name", "type": "VARCHAR(255)", "isPrimary": false, "isForeignKey": false, "isNotNull": true, "isUnique": true },
      { "name": "description", "type": "TEXT", "isPrimary": false, "isForeignKey": false, "isNotNull": false, "isUnique": false },
      { "name": "created_at", "type": "TIMESTAMP", "isPrimary": false, "isForeignKey": false, "isNotNull": true, "isUnique": false },
      { "name": "updated_at", "type": "TIMESTAMP", "isPrimary": false, "isForeignKey": false, "isNotNull": true, "isUnique": false }
    ],
    "position": { "x": 1040, "y": 146 }
  },
  "products": {
    "columns": [
      { "name": "id", "type": "UUID", "isPrimary": true, "isForeignKey": false, "isNotNull": true, "isUnique": false },
      { "name": "name", "type": "VARCHAR(255)", "isPrimary": false, "isForeignKey": false, "isNotNull": true, "isUnique": false },
      { "name": "description", "type": "TEXT", "isPrimary": false, "isForeignKey": false, "isNotNull": false, "isUnique": false },
      { "name": "price", "type": "DECIMAL(10,2)", "isPrimary": false, "isForeignKey": false, "isNotNull": true, "isUnique": false },
      {
        "name": "category_id",
        "type": "UUID",
        "isPrimary": false,
        "isForeignKey": true,
        "isNotNull": true,
        "isUnique": false,
        "references": { "table": "categories", "column": "id" }
      },
      { "name": "image_url", "type": "VARCHAR(255)", "isPrimary": false, "isForeignKey": false, "isNotNull": false, "isUnique": false },
      { "name": "sku", "type": "VARCHAR(100)", "isPrimary": false, "isForeignKey": false, "isNotNull": false, "isUnique": true },
      { "name": "created_at", "type": "TIMESTAMP", "isPrimary": false, "isForeignKey": false, "isNotNull": true, "isUnique": false },
      { "name": "updated_at", "type": "TIMESTAMP", "isPrimary": false, "isForeignKey": false, "isNotNull": true, "isUnique": false }
    ],
    "position": { "x": 560, "y": 80 }
  },
  "inventory": {
    "columns": [
      { "name": "id", "type": "UUID", "isPrimary": true, "isForeignKey": false, "isNotNull": true, "isUnique": false },
      {
        "name": "product_id",
        "type": "UUID",
        "isPrimary": false,
        "isForeignKey": true,
        "isNotNull": true,
        "isUnique": true,
        "references": { "table": "products", "column": "id" }
      },
      { "name": "quantity", "type": "INTEGER", "isPrimary": false, "isForeignKey": false, "isNotNull": true, "isUnique": false },
      { "name": "last_restock_date", "type": "TIMESTAMP", "isPrimary": false, "isForeignKey": false, "isNotNull": false, "isUnique": false },
      { "name": "created_at", "type": "TIMESTAMP", "isPrimary": false, "isForeignKey": false, "isNotNull": true, "isUnique": false },
      { "name": "updated_at", "type": "TIMESTAMP", "isPrimary": false, "isForeignKey": false, "isNotNull": true, "isUnique": false }
    ],
    "position": { "x": 80, "y": 122 }
  },
  "orders": {
    "columns": [
      { "name": "id", "type": "UUID", "isPrimary": true, "isForeignKey": false, "isNotNull": true, "isUnique": false },
      {
        "name": "user_id",
        "type": "UUID",
        "isPrimary": false,
        "isForeignKey": true,
        "isNotNull": true,
        "isUnique": false,
        "references": { "table": "users", "column": "id" }
      },
      { "name": "order_date", "type": "TIMESTAMP", "isPrimary": false, "isForeignKey": false, "isNotNull": true, "isUnique": false },
      { "name": "total_amount", "type": "DECIMAL(10,2)", "isPrimary": false, "isForeignKey": false, "isNotNull": true, "isUnique": false },
      { "name": "status", "type": "VARCHAR(50)", "isPrimary": false, "isForeignKey": false, "isNotNull": true, "isUnique": false },
      { "name": "shipping_address", "type": "VARCHAR(255)", "isPrimary": false, "isForeignKey": false, "isNotNull": false, "isUnique": false },
      { "name": "shipping_city", "type": "VARCHAR(255)", "isPrimary": false, "isForeignKey": false, "isNotNull": false, "isUnique": false },
      { "name": "shipping_state", "type": "VARCHAR(255)", "isPrimary": false, "isForeignKey": false, "isNotNull": false, "isUnique": false },
      { "name": "shipping_zip_code", "type": "VARCHAR(20)", "isPrimary": false, "isForeignKey": false, "isNotNull": false, "isUnique": false },
      { "name": "created_at", "type": "TIMESTAMP", "isPrimary": false, "isForeignKey": false, "isNotNull": true, "isUnique": false },
      { "name": "updated_at", "type": "TIMESTAMP", "isPrimary": false, "isForeignKey": false, "isNotNull": true, "isUnique": false }
    ],
    "position": { "x": 560, "y": 592 }
  },
  "order_items": {
    "columns": [
      {
        "name": "order_id",
        "type": "UUID",
        "isPrimary": true,
        "isForeignKey": true,
        "isNotNull": true,
        "isUnique": false,
        "references": { "table": "orders", "column": "id" }
      },
      {
        "name": "product_id",
        "type": "UUID",
        "isPrimary": true,
        "isForeignKey": true,
        "isNotNull": true,
        "isUnique": false,
        "references": { "table": "products", "column": "id" }
      },
      { "name": "quantity", "type": "INTEGER", "isPrimary": false, "isForeignKey": false, "isNotNull": true, "isUnique": false },
      { "name": "price", "type": "DECIMAL(10,2)", "isPrimary": false, "isForeignKey": false, "isNotNull": true, "isUnique": false },
      { "name": "created_at", "type": "TIMESTAMP", "isPrimary": false, "isForeignKey": false, "isNotNull": true, "isUnique": false },
      { "name": "updated_at", "type": "TIMESTAMP", "isPrimary": false, "isForeignKey": false, "isNotNull": true, "isUnique": false }
    ],
    "position": { "x": 80, "y": 550 }
  },
  "carts": {
    "columns": [
      { "name": "id", "type": "UUID", "isPrimary": true, "isForeignKey": false, "isNotNull": true, "isUnique": false },
      {
        "name": "user_id",
        "type": "UUID",
        "isPrimary": false,
        "isForeignKey": true,
        "isNotNull": true,
        "isUnique": true,
        "references": { "table": "users", "column": "id" }
      },
      { "name": "created_at", "type": "TIMESTAMP", "isPrimary": false, "isForeignKey": false, "isNotNull": true, "isUnique": false },
      { "name": "updated_at", "type": "TIMESTAMP", "isPrimary": false, "isForeignKey": false, "isNotNull": true, "isUnique": false }
    ],
    "position": { "x": 560, "y": 1160 }
  },
  "cart_items": {
    "columns": [
      {
        "name": "cart_id",
        "type": "UUID",
        "isPrimary": true,
        "isForeignKey": true,
        "isNotNull": true,
        "isUnique": false,
        "references": { "table": "carts", "column": "id" }
      },
      {
        "name": "product_id",
        "type": "UUID",
        "isPrimary": true,
        "isForeignKey": true,
        "isNotNull": true,
        "isUnique": false,
        "references": { "table": "products", "column": "id" }
      },
      { "name": "quantity", "type": "INTEGER", "isPrimary": false, "isForeignKey": false, "isNotNull": true, "isUnique": false },
      { "name": "created_at", "type": "TIMESTAMP", "isPrimary": false, "isForeignKey": false, "isNotNull": true, "isUnique": false },
      { "name": "updated_at", "type": "TIMESTAMP", "isPrimary": false, "isForeignKey": false, "isNotNull": true, "isUnique": false }
    ],
    "position": { "x": 80, "y": 978 }
  }
};

const initialSqlSchema = `-- Fully optimized E-Commerce Schema

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    address VARCHAR(255),
    city VARCHAR(255),
    state VARCHAR(255),
    zip_code VARCHAR(20),
    phone_number VARCHAR(20),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category_id UUID NOT NULL,
    image_url VARCHAR(255),
    sku VARCHAR(100) UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL UNIQUE,
    quantity INTEGER NOT NULL,
    last_restock_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    order_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    shipping_address VARCHAR(255),
    shipping_city VARCHAR(255),
    shipping_state VARCHAR(255),
    shipping_zip_code VARCHAR(20),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE order_items (
    order_id UUID NOT NULL,
    product_id UUID NOT NULL,
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (order_id, product_id),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE cart_items (
    cart_id UUID NOT NULL,
    product_id UUID NOT NULL,
    quantity INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (cart_id, product_id),
    FOREIGN KEY (cart_id) REFERENCES carts(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);`;

const initialJSON = JSON.stringify(initialERSchema, null, 2);
const { nodes: initialNodes, edges: initialEdges } = parseERSchema(initialJSON);

const initialProject: Project = {
  id: '1',
  name: 'Main Project',
  description: 'Fully-featured E-Commerce Workspace',
  nodes: initialNodes,
  edges: initialEdges,
  jsonSchema: initialJSON,
  sqlSchema: initialSqlSchema,
};

const EMPTY_SQL = `-- New Database Schema
-- Define your tables here`;

const useStore = create<DiagramState>((set, get) => ({
  projects: [initialProject],
  activeProjectId: '1',
  nodes: initialNodes,
  edges: initialEdges,
  jsonSchema: initialJSON,
  sqlSchema: initialSqlSchema,
  theme: 'dark',
  focusedColumn: null,
  focusedEdge: null,
  aiThinkingStep: null,
  setAiThinkingStep: (step) => set({ aiThinkingStep: step }),
  healthScore: 92,
  setHealthScore: (score) => set({ healthScore: score }),
  isAIPanelOpen: true,
  setIsAIPanelOpen: (open) => set({ isAIPanelOpen: open }),
  pendingPrompt: null,
  setPendingPrompt: (prompt) => set({ pendingPrompt: prompt }),
  layoutVersion: 0,

  onNodesChange: (changes: NodeChange[]) => {
    const newNodes = applyNodeChanges(changes, get().nodes);
    set({ nodes: newNodes });
    get().syncJSONFromCanvas();
    
    // Sync to projects list
    const { projects, activeProjectId } = get();
    set({
      projects: projects.map(p => p.id === activeProjectId ? { ...p, nodes: newNodes } : p)
    });
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    const newEdges = applyEdgeChanges(changes, get().edges);
    set({ edges: newEdges });
    get().syncJSONFromCanvas();

    // Sync to projects list
    const { projects, activeProjectId } = get();
    set({
      projects: projects.map(p => p.id === activeProjectId ? { ...p, edges: newEdges } : p)
    });
  },

  onConnect: (connection: Connection) => {
    const newEdges = addEdge({ ...connection, animated: true, style: { strokeWidth: 2 } }, get().edges);
    set({ edges: newEdges });
    get().syncJSONFromCanvas();

    // Sync to projects list
    const { projects, activeProjectId } = get();
    set({
      projects: projects.map(p => p.id === activeProjectId ? { ...p, edges: newEdges } : p)
    });
  },

  setNodes: (nodes: Node[]) => set({ nodes }),
  setEdges: (edges: Edge[]) => set({ edges }),
  setFocusedColumn: (col) => set({ focusedColumn: col, focusedEdge: null }),
  setFocusedEdge: (edgeId) => set({ focusedEdge: edgeId, focusedColumn: null }),
  toggleTheme: () => set(state => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
  
  setJsonSchema: (jsonSchema: string) => {
    set({ jsonSchema });
    const { projects, activeProjectId } = get();
    set({
      projects: projects.map(p => p.id === activeProjectId ? { ...p, jsonSchema } : p)
    });
  },

  setSqlSchema: (sqlSchema: string) => {
    set({ sqlSchema });
    const { projects, activeProjectId } = get();
    set({
      projects: projects.map(p => p.id === activeProjectId ? { ...p, sqlSchema } : p)
    });
  },

  updateFromJSON: (schema: string) => {
    try {
      const { nodes: rawNodes, edges: rawEdges } = parseERSchema(schema);
      if (rawNodes.length > 0) {
        // Apply ELK layout asynchronously
        applyElkLayout(rawNodes, rawEdges).then(({ nodes: laid, edges: laidEdges }) => {
          set({ nodes: laid, edges: laidEdges, jsonSchema: schema, layoutVersion: get().layoutVersion + 1 });
          const { projects, activeProjectId } = get();
          set({
            projects: projects.map(p => p.id === activeProjectId ? { ...p, nodes: laid, edges: laidEdges, jsonSchema: schema } : p)
          });
        }).catch(() => {
          // Fallback without layout
          set({ nodes: rawNodes, edges: rawEdges, jsonSchema: schema });
        });
      }
    } catch (e) {
      // JSON might be invalid while typing
    }
  },

  autoLayout: async () => {
    const { nodes, edges } = get();
    if (nodes.length === 0) return;
    try {
      const { nodes: laid, edges: laidEdges } = await applyElkLayout(nodes, edges);
      set({ nodes: laid, edges: laidEdges, layoutVersion: get().layoutVersion + 1 });
      get().syncJSONFromCanvas();
      const { projects, activeProjectId } = get();
      set({
        projects: projects.map(p => p.id === activeProjectId ? { ...p, nodes: laid, edges: laidEdges } : p)
      });
    } catch (e) {
      console.error('Auto layout failed:', e);
    }
  },

  syncJSONFromCanvas: () => {
    const { nodes, jsonSchema, projects, activeProjectId } = get();
    try {
      const parsed = JSON.parse(jsonSchema);
      nodes.forEach(node => {
        if (parsed[node.id]) {
          parsed[node.id].position = {
            x: Math.round(node.position.x),
            y: Math.round(node.position.y)
          };
        }
      });
      const newJson = JSON.stringify(parsed, null, 2);
      set({ jsonSchema: newJson });
      
      // Sync to projects list
      set({
        projects: projects.map(p => p.id === activeProjectId ? { ...p, jsonSchema: newJson } : p)
      });
    } catch (e) {
      // JSON might be invalid during editing, skip sync
    }
  },

  addProject: (name: string, description: string) => {
    const id = Date.now().toString();
    const newProject: Project = {
      id,
      name: name || `Project ${get().projects.length + 1}`,
      description: description || '',
      nodes: [],
      edges: [],
      jsonSchema: '{}',
      sqlSchema: EMPTY_SQL,
    };
    set(state => ({
      projects: [...state.projects, newProject],
      activeProjectId: id,
      nodes: [],
      edges: [],
      jsonSchema: '{}',
      sqlSchema: EMPTY_SQL,
      focusedColumn: null,
      focusedEdge: null,
    }));
  },

  switchProject: (id: string) => {
    const project = get().projects.find(p => p.id === id);
    if (project) {
      set({
        activeProjectId: id,
        nodes: project.nodes,
        edges: project.edges,
        jsonSchema: project.jsonSchema,
        sqlSchema: project.sqlSchema,
        focusedColumn: null,
        focusedEdge: null,
      });
    }
  },

  removeProject: (id: string) => {
    const { projects, activeProjectId } = get();
    if (projects.length === 1) return; // Don't remove the last project

    const newProjects = projects.filter(p => p.id !== id);
    set({ projects: newProjects });

    if (activeProjectId === id) {
      get().switchProject(newProjects[0].id);
    }
  },

  renameProject: (id: string, name: string) => {
    set(state => ({
      projects: state.projects.map(p => p.id === id ? { ...p, name } : p)
    }));
  }
}));

export default useStore;

import express from 'express';
import {
  createAgent,
  getAgents,
  getAgentById,
  updateAgent,
  deleteAgent,
  updateAgentStatus,
  getAgentAnomalies
} from '../controllers/agentControllers.js';

const router = express.Router();

// CRUD
router.post('/', createAgent);
router.get('/', getAgents);
router.get('/:id', getAgentById);
router.put('/:id', updateAgent);
router.delete('/:id', deleteAgent);
router.patch('/:id/status', updateAgentStatus);

// Get anomaly processes
// ${agentId}/anomaly/processes
router.get("/:id/anomaly/processes", getAgentAnomalies)

export default router;
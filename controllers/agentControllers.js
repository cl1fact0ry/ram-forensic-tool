import Agent from '../models/agentModel.js';

// Agent yaratmaq
export const createAgent = async (req, res) => {
  try {
    const { name, os, ipAddress } = req.body;
    
    const agent = new Agent({
      name,
      os,
      ipAddress
    });
    
    const savedAgent = await agent.save();
    res.status(201).json(savedAgent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Bütün agentləri gətirmək
export const getAgents = async (req, res) => {
  try {
    const agents = await Agent.find();
    res.json(agents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Agentı ID ilə gətirmək
export const getAgentById = async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id);
    if (!agent) {
      return res.status(404).json({ message: 'Agent tapılmadı' });
    }
    res.json(agent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Agentı yeniləmək
export const updateAgent = async (req, res) => {
  try {
    const agent = await Agent.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent tapılmadı' });
    }
    
    res.json(agent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Agentı silmək
export const deleteAgent = async (req, res) => {
  try {
    const agent = await Agent.findByIdAndDelete(req.params.id);
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent tapılmadı' });
    }
    
    res.json({ message: 'Agent silindi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Agentın statusunu yeniləmək
export const updateAgentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const agent = await Agent.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent tapılmadı' });
    }
    
    res.json(agent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getAgentAnomalies = async (req, res, next) => {
  try {
    const agent = await Agent.findById(req.params.id).populate('agentDataHistory');

    if (!agent) {
      return res.status(404).json({ message: 'Agent tapılmadı' });
    }

    if (!agent.agentDataHistory || agent.agentDataHistory.length === 0) {
      return res.status(200).json({ anomalies: [], message: 'No data collected yet' });
    }

    const anomalies = [];
    const currentData = agent.agentDataHistory[0];
    const historicalData = agent.agentDataHistory.slice(0, 10); // Last 10 data points for trend analysis

    // 1. RAM Anomalies
    analyzeRAMAnomalies(currentData, historicalData, anomalies);
    
    // 2. Process Anomalies
    analyzeProcessAnomalies(currentData, anomalies);
    
    // 3. System Status Anomalies
    analyzeSystemStatusAnomalies(agent, anomalies);
    
    // 4. Network Anomalies
    analyzeNetworkAnomalies(agent, currentData, anomalies);
    
    // 5. Security Anomalies
    analyzeSecurityAnomalies(currentData, anomalies);
    
    // 6. Performance Trend Anomalies
    analyzePerformanceTrends(historicalData, anomalies);
    
    // 7. Resource Exhaustion Anomalies
    analyzeResourceExhaustion(currentData, historicalData, anomalies);
    
    // 8. Application-specific Anomalies
    analyzeApplicationAnomalies(currentData, anomalies);

    // Sort anomalies by severity
    anomalies.sort((a, b) => b.severity - a.severity);

    return res.status(200).json({
      agentId: agent._id,
      agentName: agent.name,
      totalAnomalies: anomalies.length,
      criticalAnomalies: anomalies.filter(a => a.severity === 'critical').length,
      warningAnomalies: anomalies.filter(a => a.severity === 'warning').length,
      anomalies: anomalies,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    next(error);
  }
};

// Helper functions for different types of anomaly detection

const analyzeRAMAnomalies = (currentData, historicalData, anomalies) => {
  const ram = currentData.ramData;
  
  // High RAM usage
  if (ram.percent >= 90) {
    anomalies.push({
      type: 'CRITICAL_HIGH_RAM_USAGE',
      severity: 'critical',
      value: ram.percent,
      threshold: 90,
      message: `RAM usage critically high at ${ram.percent}%`,
      timestamp: currentData.collectedAt
    });
  } else if (ram.percent >= 80) {
    anomalies.push({
      type: 'HIGH_RAM_USAGE',
      severity: 'warning',
      value: ram.percent,
      threshold: 80,
      message: `RAM usage high at ${ram.percent}%`,
      timestamp: currentData.collectedAt
    });
  }

  // RAM usage spike detection
  if (historicalData.length > 2) {
    const recentAvg = historicalData.slice(0, 3).reduce((sum, data) => 
      sum + data.ramData.percent, 0) / 3;
    
    if (ram.percent > recentAvg * 1.5) { // 50% spike
      anomalies.push({
        type: 'RAM_USAGE_SPIKE',
        severity: 'warning',
        current: ram.percent,
        average: recentAvg.toFixed(1),
        spikePercentage: ((ram.percent / recentAvg - 1) * 100).toFixed(1),
        message: `RAM usage spiked from ${recentAvg.toFixed(1)}% to ${ram.percent}%`,
        timestamp: currentData.collectedAt
      });
    }
  }
};

const analyzeProcessAnomalies = (currentData, anomalies) => {
  const processes = currentData.processData;
  const processCount = processes.length;
  
  // Too many processes
  if (processCount > 250) {
    anomalies.push({
      type: 'HIGH_PROCESS_COUNT',
      severity: 'warning',
      count: processCount,
      threshold: 250,
      message: `High number of running processes: ${processCount}`,
      timestamp: currentData.collectedAt
    });
  }

  // Suspicious process patterns
  const suspiciousPatterns = [
    /\.miner\./i, /cryptominer/i, /coinminer/i, /xmr-stak/i,
    /powershell.*-encod/i, /wscript.*\.vbs/i, /cmd\.exe.*\/c/i
  ];

  processes.forEach(proc => {
    // Unknown/empty process names
    if (!proc.name || proc.name.trim() === '') {
      anomalies.push({
        type: 'UNNAMED_PROCESS',
        severity: 'critical',
        pid: proc.pid,
        username: proc.username,
        message: `Process with PID ${proc.pid} has no name`,
        timestamp: currentData.collectedAt
      });
    }

    // Suspicious process names
    suspiciousPatterns.forEach(pattern => {
      if (proc.name && pattern.test(proc.name)) {
        anomalies.push({
          type: 'SUSPICIOUS_PROCESS',
          severity: 'critical',
          pid: proc.pid,
          name: proc.name,
          username: proc.username,
          pattern: pattern.toString(),
          message: `Suspicious process detected: ${proc.name} (PID: ${proc.pid})`,
          timestamp: currentData.collectedAt
        });
      }
    });

    // System processes running as user
    const systemProcesses = ['svchost.exe', 'lsass.exe', 'services.exe', 'wininit.exe'];
    if (systemProcesses.includes(proc.name) && proc.username && 
        !proc.username.includes('SYSTEM') && !proc.username.includes('LOCAL SERVICE')) {
      anomalies.push({
        type: 'SYSTEM_PROCESS_USER_CONTEXT',
        severity: 'critical',
        pid: proc.pid,
        name: proc.name,
        username: proc.username,
        message: `System process ${proc.name} running under user context: ${proc.username}`,
        timestamp: currentData.collectedAt
      });
    }

    // Multiple instances of same process
    const sameNameProcesses = processes.filter(p => p.name === proc.name);
    if (sameNameProcesses.length > 10) {
      anomalies.push({
        type: 'PROCESS_FORK_BOMB',
        severity: 'critical',
        process: proc.name,
        instances: sameNameProcesses.length,
        message: `Multiple instances (${sameNameProcesses.length}) of ${proc.name} detected`,
        timestamp: currentData.collectedAt
      });
    }
  });

  // Stopped critical processes
  const criticalProcesses = ['lsass.exe', 'services.exe', 'winlogon.exe', 'csrss.exe'];
  criticalProcesses.forEach(criticalProc => {
    const proc = processes.find(p => p.name === criticalProc && p.status === 'stopped');
    if (proc) {
      anomalies.push({
        type: 'CRITICAL_PROCESS_STOPPED',
        severity: 'critical',
        process: criticalProc,
        pid: proc.pid,
        message: `Critical system process ${criticalProc} is stopped`,
        timestamp: currentData.collectedAt
      });
    }
  });
};

const analyzeSystemStatusAnomalies = (agent, anomalies) => {
  // Agent offline
  if (!agent.isOnline) {
    anomalies.push({
      type: 'AGENT_OFFLINE',
      severity: 'critical',
      status: agent.status,
      lastSeen: agent.lastSeen,
      message: `Agent has been offline since ${new Date(agent.lastSeen).toLocaleString()}`,
      timestamp: new Date().toISOString()
    });
  }

  // Agent inactive but online
  if (agent.isOnline && agent.status !== 'active') {
    anomalies.push({
      type: 'AGENT_INACTIVE',
      severity: 'warning',
      status: agent.status,
      message: `Agent is online but status is ${agent.status}`,
      timestamp: new Date().toISOString()
    });
  }

  // Long uptime anomaly (potential never-rebooted system)
  const registeredDate = new Date(agent.registeredAt);
  const uptimeDays = (new Date() - registeredDate) / (1000 * 60 * 60 * 24);
  if (uptimeDays > 30) {
    anomalies.push({
      type: 'LONG_UPTIME',
      severity: 'warning',
      days: uptimeDays.toFixed(1),
      message: `System has been running for ${uptimeDays.toFixed(1)} days without reboot`,
      timestamp: new Date().toISOString()
    });
  }
};

const analyzeNetworkAnomalies = (agent, currentData, anomalies) => {
  // Check for suspicious IP patterns
  const ip = agent.ipAddress;
  if (ip) {
    // Private IP in production (example)
    const privateIPRanges = [
      /^10\./, /^172\.(1[6-9]|2[0-9]|3[0-1])\./, /^192\.168\./
    ];
    
    const isPrivateIP = privateIPRanges.some(range => range.test(ip));
    if (isPrivateIP) {
      anomalies.push({
        type: 'PRIVATE_IP_DETECTED',
        severity: 'warning',
        ip: ip,
        message: `Agent using private IP address: ${ip}`,
        timestamp: new Date().toISOString()
      });
    }
  }
};

const analyzeSecurityAnomalies = (currentData, anomalies) => {
  const processes = currentData.processData;
  
  // Check for security software
  const securityProcesses = processes.filter(p => 
    p.name.includes('defender') || p.name.includes('antivirus') || 
    p.name.includes('security') || p.name.includes('firewall')
  );

  if (securityProcesses.length === 0) {
    anomalies.push({
      type: 'NO_SECURITY_SOFTWARE',
      severity: 'warning',
      message: 'No security/antivirus processes detected',
      timestamp: currentData.collectedAt
    });
  }

  // Check for debugging/injection tools
  const debugTools = ['ollydbg', 'x64dbg', 'ida', 'cheatengine', 'processhacker'];
  debugTools.forEach(tool => {
    const found = processes.find(p => p.name && p.name.toLowerCase().includes(tool));
    if (found) {
      anomalies.push({
        type: 'DEBUG_TOOL_DETECTED',
        severity: 'critical',
        tool: tool,
        process: found.name,
        pid: found.pid,
        message: `Debugging tool ${tool} detected running`,
        timestamp: currentData.collectedAt
      });
    }
  });
};

const analyzePerformanceTrends = (historicalData, anomalies) => {
  if (historicalData.length < 5) return;

  // Calculate RAM usage trend
  const ramTrend = historicalData.map(data => data.ramData.percent);
  const ramSlope = calculateSlope(ramTrend);
  
  if (ramSlope > 5) { // Increasing trend
    anomalies.push({
      type: 'RAM_USAGE_INCREASING_TREND',
      severity: 'warning',
      slope: ramSlope.toFixed(2),
      trend: 'increasing',
      message: `RAM usage shows increasing trend (slope: ${ramSlope.toFixed(2)}%/interval)`,
      timestamp: historicalData[0].collectedAt
    });
  }

  // Process count trend
  const processTrend = historicalData.map(data => data.processData.length);
  const processSlope = calculateSlope(processTrend);
  
  if (processSlope > 10) {
    anomalies.push({
      type: 'PROCESS_COUNT_INCREASING',
      severity: 'warning',
      slope: processSlope.toFixed(2),
      message: `Process count increasing rapidly (slope: ${processSlope.toFixed(2)} processes/interval)`,
      timestamp: historicalData[0].collectedAt
    });
  }
};

const analyzeResourceExhaustion = (currentData, historicalData, anomalies) => {
  const ram = currentData.ramData;
  
  // Memory exhaustion prediction
  if (historicalData.length >= 3) {
    const recentRAM = historicalData.slice(0, 3).map(d => d.ramData.percent);
    const ramTrend = calculateSlope(recentRAM);
    
    if (ramTrend > 2 && ram.percent > 70) {
      const predictedExhaustion = ram.percent + (ramTrend * 6); // Predict 6 intervals ahead
      if (predictedExhaustion >= 95) {
        anomalies.push({
          type: 'MEMORY_EXHAUSTION_PREDICTED',
          severity: 'warning',
          current: ram.percent,
          trend: ramTrend.toFixed(2),
          predicted: predictedExhaustion.toFixed(1),
          message: `Memory exhaustion predicted within 6 intervals (current: ${ram.percent}%, predicted: ${predictedExhaustion.toFixed(1)}%)`,
          timestamp: currentData.collectedAt
        });
      }
    }
  }
};

const analyzeApplicationAnomalies = (currentData, anomalies) => {
  const processes = currentData.processData;
  
  // Multiple browser instances
  const browsers = processes.filter(p => 
    p.name && (p.name.includes('chrome') || p.name.includes('firefox') || 
    p.name.includes('edge') || p.name.includes('brave'))
  );
  
  if (browsers.length > 20) {
    anomalies.push({
      type: 'EXCESSIVE_BROWSER_INSTANCES',
      severity: 'warning',
      count: browsers.length,
      message: `Excessive browser instances detected: ${browsers.length}`,
      timestamp: currentData.collectedAt
    });
  }

  // Development tools in production (example)
  const devTools = processes.filter(p => 
    p.name && (p.name.includes('vscode') || p.name.includes('code.exe') || 
    p.name.includes('webstorm') || p.name.includes('intellij'))
  );
  
  if (devTools.length > 5) {
    anomalies.push({
      type: 'DEVELOPMENT_TOOLS_IN_PRODUCTION',
      severity: 'warning',
      count: devTools.length,
      tools: devTools.map(t => t.name),
      message: `Development tools detected in production environment`,
      timestamp: currentData.collectedAt
    });
  }
};

// Utility function to calculate slope of a trend
const calculateSlope = (data) => {
  if (data.length < 2) return 0;
  
  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  
  data.forEach((y, x) => {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  });
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  return slope;
};
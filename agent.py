import psutil
import requests
import socket
import platform
import getpass
import time
from datetime import datetime

class LiveAgent:
    def __init__(self, server_url, agent_name, agent_os, collection_interval=60):
        self.server_url = server_url
        self.agent_name = agent_name
        self.agent_os = agent_os
        self.collection_interval = collection_interval
        self.agent_id = None
        self.ip_address = self.get_ip_address()

    def get_ip_address(self):
        """Get local IP address"""
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except:
            return "127.0.0.1"

    def get_system_info(self):
        """Detailed system info"""
        return {
            "cpuCores": psutil.cpu_count(),
            "totalMemory": psutil.virtual_memory().total,
            "architecture": platform.machine(),
            "hostname": platform.node(),
            "username": getpass.getuser(),
            "platform": platform.platform(),
            "pythonVersion": platform.python_version(),
            "additionalInfo": {
                "bootTime": datetime.fromtimestamp(psutil.boot_time()).isoformat(),
                "uptime": time.time() - psutil.boot_time()
            }
        }

    def get_ram_data(self):
        ram = psutil.virtual_memory()
        return {
            "total": ram.total,
            "available": ram.available,
            "used": ram.used,
            "percent": ram.percent,
            "free": ram.free,
            "timestamp": datetime.now().isoformat()
        }

    def get_process_data(self):
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'username', 'status']):
            try:
                processes.append(proc.info)
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue
        return processes

    def register_agent(self):
        """Register agent on server"""
        payload = {
            "name": self.agent_name,
            "os": self.agent_os,
            "ipAddress": self.ip_address,
            "status": "active",
            "isOnline": True,
            "version": "1.0.0",
            "lastSeen": datetime.now().isoformat(),
            "systemInfo": self.get_system_info(),
            "agentDataHistory": [{
                "ramData": self.get_ram_data(),
                "processData": self.get_process_data(),
                "collectedAt": datetime.now().isoformat()
            }],
            "registeredAt": datetime.now().isoformat()
        }

        try:
            response = requests.post(
                f"{self.server_url}/api/agents",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            if response.status_code == 201:
                agent_data = response.json()
                self.agent_id = agent_data.get("_id") or agent_data.get("id")
                print(f"Agent registered successfully. ID: {self.agent_id}")
                return True
            else:
                print(f"Failed to register agent: {response.status_code} - {response.text}")
                return False
        except requests.exceptions.RequestException as e:
            print(f"Error registering agent: {e}")
            return False

    def update_agent_data(self):
        """Update agent: clear agentDataHistory and add new snapshot"""
        if not self.agent_id:
            print("Agent not registered yet.")
            return False

        payload = {
            "isOnline": True,
            "lastSeen": datetime.now().isoformat(),
            "agentDataHistory": [  # Clear old history and add new snapshot
                {
                    "ramData": self.get_ram_data(),
                    "processData": self.get_process_data(),
                    "collectedAt": datetime.now().isoformat()
                }
            ]
        }

        try:
            response = requests.put(
                f"{self.server_url}/api/agents/{self.agent_id}",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            if response.status_code in [200, 201]:
                print(f"[{datetime.now().isoformat()}] Agent data updated successfully")
                return True
            else:
                print(f"Failed to update agent: {response.status_code} - {response.text}")
                return False
        except requests.exceptions.RequestException as e:
            print(f"Error updating agent: {e}")
            return False

    def run(self):
        """Main loop: register and continuously update agent data"""
        print(f"Starting live agent: {self.agent_name}")
        if not self.register_agent():
            print("Agent registration failed. Exiting.")
            return

        print("Entering continuous update loop. Press Ctrl+C to stop.")

        try:
            while True:
                self.update_agent_data()
                time.sleep(self.collection_interval)
        except KeyboardInterrupt:
            print("\nAgent stopped by user")
        except Exception as e:
            print(f"Agent stopped due to error: {e}")


if __name__ == "__main__":
    SERVER_URL = "http://localhost:5000"  # Change to your server
    AGENT_NAME = f"{platform.node()}-{platform.system()}"
    AGENT_OS = platform.system()
    COLLECTION_INTERVAL = 10  # seconds

    agent = LiveAgent(SERVER_URL, AGENT_NAME, AGENT_OS, COLLECTION_INTERVAL)
    agent.run()

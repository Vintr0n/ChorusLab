const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export async function saveProject(project) {
  const res = await fetch(`${API_URL}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: project.name,
      data: project
    })
  });
  return res.json();
}

export async function listProjects() {
  const res = await fetch(`${API_URL}/projects`);
  return res.json();
}

export async function loadProject(id) {
  const res = await fetch(`${API_URL}/projects/${id}`);
  return res.json();
}

export async function updateProject(id, project) {
  const res = await fetch(`${API_URL}/projects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: project.name,
      data: project
    })
  });
  return res.json();
}

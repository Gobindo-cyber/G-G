// ================= FULLSTACK AI MEDIA STUDIO (EXTENDED) =================
// ✅ Includes: Auth, Credits, Image Upload, Character ID, API Integration

// === FRONTEND ADDITIONS ===

// File: frontend/src/pages/LoginPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem("token", data.token);
      navigate("/tools");
    }
  };

  return (
    <div className="p-6 max-w-sm mx-auto">
      <h2 className="text-xl font-bold mb-4">Login</h2>
      <input value={email} onChange={e => setEmail(e.target.value)} className="border p-2 w-full mb-2" placeholder="Email" />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="border p-2 w-full mb-4" placeholder="Password" />
      <button onClick={handleLogin} className="bg-blue-500 text-white px-4 py-2 rounded">Login</button>
    </div>
  );
};
export default LoginPage;


// File: frontend/src/pages/ToolPage.jsx (extended)
// Add Character ID + Image Upload
...
const [characterId, setCharacterId] = useState("");
const [image, setImage] = useState(null);

const handleGenerate = async () => {
  const formData = new FormData();
  formData.append("prompt", prompt);
  formData.append("mode", name);
  formData.append("settings", JSON.stringify({ characterId }));
  if (image) formData.append("image", image);

  const res = await fetch(`${BASE_URL}/generate`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` },
    body: formData
  });
  const data = await res.json();
  setResult(data);
};
...
<input value={characterId} onChange={e => setCharacterId(e.target.value)} placeholder="Character ID (optional)" className="border p-2 w-full mb-2" />
<input type="file" onChange={e => setImage(e.target.files[0])} className="mb-4" />
...


// === BACKEND ADDITIONS ===

// File: backend/routes/auth.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import jwt, os

router = APIRouter()
SECRET = os.getenv("SECRET_KEY", "supersecret")

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/auth/login")
def login(req: LoginRequest):
    if req.email == "admin@example.com" and req.password == "password":
        token = jwt.encode({"email": req.email}, SECRET, algorithm="HS256")
        return {"token": token, "credits": 100}
    raise HTTPException(status_code=401, detail="Invalid credentials")


// File: backend/routes/generate.py (update generate endpoint)
from fastapi import File, UploadFile, Form, Header, HTTPException
import jwt
...
@router.post("/generate")
async def generate(
    prompt: str = Form(...),
    mode: str = Form(...),
    settings: str = Form("{}"),
    image: UploadFile = File(None),
    authorization: str = Header(None)
):
    try:
        payload = jwt.decode(authorization.split()[1], os.getenv("SECRET_KEY", "supersecret"), algorithms=["HS256"])
        email = payload.get("email")
    except:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # (Optional) validate credits, characterId, etc.

    provider = get_provider()
    parsed_settings = json.loads(settings)

    if provider == "openai":
        return await generate_with_openai(prompt, mode, parsed_settings)
    return await generate_with_stability(prompt, mode, parsed_settings, image)


// File: backend/ai/stability.py (image handling support)
async def generate_with_stability(prompt: str, mode: str, settings: dict, image=None):
    files = {}
    if image:
        files['image'] = (image.filename, await image.read(), image.content_type)
    payload = {"prompt": prompt, **settings}

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.stability.ai/v2beta/stable-image/generate/core",
            headers={"Authorization": f"Bearer {STABILITY_API_KEY}"},
            data=payload,
            files=files if image else None
        )
        return response.json()


// File: backend/main.py (register auth router)
from routes.auth import router as auth_router
...
app.include_router(auth_router, prefix="/api")

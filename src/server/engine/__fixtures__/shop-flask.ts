// Repo mẫu Flask (Python) dựng thành zip trong RAM để thử đường Python của engine (decorator route, self.field, import tuyệt đối).
import { strToU8, zipSync } from "fflate";

export const FLASK_FILES: Record<string, string> = {
  "requirements.txt": "Flask==3.0.0\nPyJWT>=2.8\n# ghi chú\n",
  "app.py": `from flask import Flask, request, jsonify
from services.order_service import OrderService
from auth import login_required

app = Flask(__name__)
service = OrderService()


@app.route("/orders", methods=["POST"])
@login_required
def create_order():
    data = request.get_json()
    order = service.checkout(data["items"])
    return jsonify(order), 201


@app.get("/orders/<int:order_id>")
def get_order(order_id):
    return jsonify(service.find(order_id))


if __name__ == "__main__":
    app.run()
`,
  "auth.py": `import jwt

SECRET_KEY = "super-secret-1234"


def login_required(fn):
    def wrapper(*args, **kwargs):
        token = kwargs.get("token")
        if not token:
            raise PermissionError("missing token")
        jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return fn(*args, **kwargs)
    return wrapper
`,
  "services/order_service.py": `from repos.order_repo import OrderRepo


class OrderService:
    def __init__(self):
        self.repo = OrderRepo()

    def checkout(self, items):
        total = 0
        for item in items:
            total += item["qty"] * item["price"]
        order = self.repo.save({"items": items, "total": total})
        return order

    def find(self, order_id):
        return self.repo.find_by_id(order_id)
`,
  "services/__init__.py": "",
  "repos/order_repo.py": `class OrderRepo:
    def save(self, order):
        return self.db.insert("orders", order)

    def find_by_id(self, order_id):
        return self.db.query("select * from orders where id = %s", order_id)
`,
  "repos/__init__.py": "",
};

export function flaskZip(prefix = "shop-flask-main/"): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  for (const [p, c] of Object.entries(FLASK_FILES)) entries[`${prefix}${p}`] = strToU8(c);
  return zipSync(entries);
}

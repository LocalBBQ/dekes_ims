import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import InventoryList from "./pages/InventoryList";
import InventoryItem from "./pages/InventoryItem";
import ProductDescription from "./pages/ProductDescription";
import AdminLocations from "./pages/admin/AdminLocations";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminUsers from "./pages/admin/AdminUsers";
import Layout from "./components/Layout";

function ProtectedRoute({ children, adminOnly }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6 text-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="inventory" element={<InventoryList />} />
        <Route
          path="inventory/new"
          element={
            <ProtectedRoute adminOnly>
              <InventoryItem />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/:id/edit"
          element={
            <ProtectedRoute adminOnly>
              <InventoryItem />
            </ProtectedRoute>
          }
        />
        <Route path="inventory/:id" element={<ProductDescription />} />
        <Route
          path="admin/locations"
          element={
            <ProtectedRoute adminOnly>
              <AdminLocations />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/categories"
          element={
            <ProtectedRoute adminOnly>
              <AdminCategories />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/users"
          element={
            <ProtectedRoute adminOnly>
              <AdminUsers />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import { Outlet } from "react-router-dom";

function AuthLayout() {
    return (
        <main style={{ minHeight: "100dvh" }}>
            <Outlet />
        </main>
    );
}

export default AuthLayout;
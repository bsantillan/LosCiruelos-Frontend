import { Outlet } from "react-router-dom";
import Navbar from "../components/NavBar/NavBar";

function MainLayout() {
    return (
        <>
            <Navbar />
            <main>
                <Outlet />
            </main>
        </>
    );
}

export default MainLayout;
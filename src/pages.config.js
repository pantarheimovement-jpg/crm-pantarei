import CRMSettings from './pages/CRMSettings';
import PipelineDashboard from './pages/PipelineDashboard';
import Students from './pages/Students';
import Courses from './pages/Courses';
import Interactions from './pages/Interactions';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CRMSettings": CRMSettings,
    "PipelineDashboard": PipelineDashboard,
    "Students": Students,
    "Courses": Courses,
    "Interactions": Interactions,
}

export const pagesConfig = {
    mainPage: "CRMSettings",
    Pages: PAGES,
    Layout: __Layout,
};
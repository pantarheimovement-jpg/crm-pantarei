import CRMSettings from './pages/CRMSettings';
import PipelineDashboard from './pages/PipelineDashboard';
import Students from './pages/Students';
import Courses from './pages/Courses';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CRMSettings": CRMSettings,
    "PipelineDashboard": PipelineDashboard,
    "Students": Students,
    "Courses": Courses,
}

export const pagesConfig = {
    mainPage: "CRMSettings",
    Pages: PAGES,
    Layout: __Layout,
};
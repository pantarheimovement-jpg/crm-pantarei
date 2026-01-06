import CRMSettings from './pages/CRMSettings';
import PipelineDashboard from './pages/PipelineDashboard';
import Students from './pages/Students';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CRMSettings": CRMSettings,
    "PipelineDashboard": PipelineDashboard,
    "Students": Students,
}

export const pagesConfig = {
    mainPage: "CRMSettings",
    Pages: PAGES,
    Layout: __Layout,
};
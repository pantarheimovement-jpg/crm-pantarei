import CRMSettings from './pages/CRMSettings';
import PipelineDashboard from './pages/PipelineDashboard';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CRMSettings": CRMSettings,
    "PipelineDashboard": PipelineDashboard,
}

export const pagesConfig = {
    mainPage: "CRMSettings",
    Pages: PAGES,
    Layout: __Layout,
};
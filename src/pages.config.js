import CRMSettings from './pages/CRMSettings';
import Courses from './pages/Courses';
import Interactions from './pages/Interactions';
import NewsletterManager from './pages/NewsletterManager';
import PipelineDashboard from './pages/PipelineDashboard';
import Students from './pages/Students';
import Tasks from './pages/Tasks';
import WhatsAppTest from './pages/WhatsAppTest';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CRMSettings": CRMSettings,
    "Courses": Courses,
    "Interactions": Interactions,
    "NewsletterManager": NewsletterManager,
    "PipelineDashboard": PipelineDashboard,
    "Students": Students,
    "Tasks": Tasks,
    "WhatsAppTest": WhatsAppTest,
}

export const pagesConfig = {
    mainPage: "CRMSettings",
    Pages: PAGES,
    Layout: __Layout,
};
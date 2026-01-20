import CRMSettings from './pages/CRMSettings';
import Courses from './pages/Courses';
import Interactions from './pages/Interactions';
import NewsletterManager from './pages/NewsletterManager';
import Tasks from './pages/Tasks';
import WhatsAppTest from './pages/WhatsAppTest';
import PipelineDashboard from './pages/PipelineDashboard';
import Students from './pages/Students';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CRMSettings": CRMSettings,
    "Courses": Courses,
    "Interactions": Interactions,
    "NewsletterManager": NewsletterManager,
    "Tasks": Tasks,
    "WhatsAppTest": WhatsAppTest,
    "PipelineDashboard": PipelineDashboard,
    "Students": Students,
}

export const pagesConfig = {
    mainPage: "CRMSettings",
    Pages: PAGES,
    Layout: __Layout,
};
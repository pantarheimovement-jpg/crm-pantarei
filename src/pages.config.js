import CRMSettings from './pages/CRMSettings';
import Courses from './pages/Courses';
import Interactions from './pages/Interactions';
import NewsletterManager from './pages/NewsletterManager';
import PipelineDashboard from './pages/PipelineDashboard';
import Tasks from './pages/Tasks';
import WhatsAppTest from './pages/WhatsAppTest';
import Students from './pages/Students';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CRMSettings": CRMSettings,
    "Courses": Courses,
    "Interactions": Interactions,
    "NewsletterManager": NewsletterManager,
    "PipelineDashboard": PipelineDashboard,
    "Tasks": Tasks,
    "WhatsAppTest": WhatsAppTest,
    "Students": Students,
}

export const pagesConfig = {
    mainPage: "CRMSettings",
    Pages: PAGES,
    Layout: __Layout,
};
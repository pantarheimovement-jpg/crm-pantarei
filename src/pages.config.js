import CRMSettings from './pages/CRMSettings';
import Contacts from './pages/Contacts';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CRMSettings": CRMSettings,
    "Contacts": Contacts,
}

export const pagesConfig = {
    mainPage: "CRMSettings",
    Pages: PAGES,
    Layout: __Layout,
};
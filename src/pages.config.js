import Contacts from './pages/Contacts';
import CRMSettings from './pages/CRMSettings';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Contacts": Contacts,
    "CRMSettings": CRMSettings,
}

export const pagesConfig = {
    mainPage: "CRMSettings",
    Pages: PAGES,
    Layout: __Layout,
};
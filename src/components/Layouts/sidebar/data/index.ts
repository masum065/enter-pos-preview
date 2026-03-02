import * as Icons from "../icons";

export const NAV_DATA = [
  {
    label: "MAIN MENU",
    items: [
      {
        title: "Dashboard",
        url: "/",
        icon: Icons.HomeIcon,
        items: [],
      },
      {
        title: "Sales",
        icon: Icons.SalesIcon,
        items: [
          {
            title: "New Invoice",
            url: "/sales/new",
          },
          {
            title: "Sales History",
            url: "/sales",
          },
          {
            title: "Due Collection",
            url: "/sales/due",
          },
        ],
      },
      {
        title: "Customers",
        url: "/customers",
        icon: Icons.CustomersIcon,
        items: [],
      },
      {
        title: "Inventory",
        icon: Icons.InventoryIcon,
        items: [
          {
            title: "Products",
            url: "/inventory/products",
          },
          {
            title: "Stock",
            url: "/inventory/stock",
          },
          {
            title: "Add Stock",
            url: "/inventory/stock/add",
          },
        ],
      },
      {
        title: "Services",
        icon: Icons.ServiceIcon,
        items: [
          {
            title: "New Service",
            url: "/services/new",
          },
          {
            title: "Service List",
            url: "/services",
          },
        ],
      },
      {
        title: "Purchases",
        icon: Icons.SalesIcon,
        items: [
          {
            title: "New Purchase",
            url: "/purchases/new",
          },
          {
            title: "Purchase History",
            url: "/purchases",
          },
        ],
      },
      {
        title: "Expenses",
        icon: Icons.ExpenseIcon,
        items: [
          {
            title: "Add Expense",
            url: "/expenses/new",
          },
          {
            title: "Expense List",
            url: "/expenses",
          },
        ],
      },
      {
        title: "Suppliers",
        icon: Icons.SuppliersIcon,
        items: [
          {
            title: "Add Supplier",
            url: "/suppliers/new",
          },
          {
            title: "Supplier List",
            url: "/suppliers",
          },
        ],
      },
    ],
  },
  {
    label: "REPORTS & ANALYTICS",
    items: [
      {
        title: "Reports",
        url: "/reports",
        icon: Icons.ReportsIcon,
        items: [],
      },
      {
        title: "Charts",
        url: "/charts/basic-chart",
        icon: Icons.PieChart,
        items: [],
      },
    ],
  },
  {
    label: "SETTINGS",
    items: [
      {
        title: "Profile",
        url: "/profile",
        icon: Icons.User,
        items: [],
      },
      {
        title: "Settings",
        url: "/settings",
        icon: Icons.SettingsGearIcon,
        items: [],
      },
      {
        title: "Sign In",
        url: "/auth/sign-in",
        icon: Icons.Authentication,
        items: [],
      },
    ],
  },
];


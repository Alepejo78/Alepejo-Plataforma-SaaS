export interface TopBarProps {
  companyName?: string;
  isMobileNavigationOpen: boolean;
  onMobileNavigationToggle: () => void;
  userName?: string;
  workspaceLabel?: string;
  /** false no layout horizontal: a sidebar lateral não existe para abrir. */
  showMobileNavigationToggle?: boolean;
}

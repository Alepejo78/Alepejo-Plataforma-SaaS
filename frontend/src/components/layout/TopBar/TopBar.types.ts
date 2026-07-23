export interface TopBarProps {
  companyName?: string;
  isMobileNavigationOpen: boolean;
  onMobileNavigationToggle: () => void;
  userName?: string;
  workspaceLabel?: string;
}

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useAuth } from "../../../hooks/useAuth";

function getFirstTwoInitialsFromName(name: string) {
  const initials = name.split(' ').map((n) => n.charAt(0)).join('');
  return initials.slice(0, 2).toUpperCase();
}

export function BaseEdubotUserNav() {
  const { account, logout } = useAuth();
  function handleLogout() {
    logout();
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="tw-relative tw-w-8 tw-h-8 tw-rounded-full">
          <Avatar className="tw-w-8 tw-h-8">
            <AvatarImage src="/avatars/01.png" alt="@shadcn" />
            <AvatarFallback className="tw-bg-muted tw-text-primary tw-border-primary tw-border-2">{getFirstTwoInitialsFromName(account?.user?.name ?? account?.student?.name ?? "Edubot User")}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="tw-w-56" align="end" forceMount>
        <DropdownMenuLabel className="tw-font-normal">
          <div className="tw-flex tw-flex-col tw-space-y-1">
            <p className="tw-text-sm tw-font-medium tw-leading-none">{account?.user?.name ?? account?.student?.name ?? "Edubot User"}</p>
            <p className="tw-text-xs tw-leading-none tw-text-muted-foreground">
              {account?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* <DropdownMenuGroup>
          <DropdownMenuItem>
            Profile
            <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            Billing
            <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            Settings
            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>New Team</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator /> */}
        <DropdownMenuItem onClick={handleLogout}>
          Log out
          {/* <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut> */}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
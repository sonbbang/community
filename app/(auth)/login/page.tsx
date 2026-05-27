// app/(auth)/login/page.tsx
import { signIn } from "@/lib/auth"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-4xl font-bold tracking-tight">Community</h1>
        <p className="text-muted-foreground">Threads처럼, 우리만의 공간</p>
        <form
          action={async () => {
            "use server"
            await signIn("kakao", { redirectTo: "/" })
          }}
        >
          <Button
            type="submit"
            size="lg"
            className="bg-[#FEE500] hover:bg-[#FEE500]/90 text-black font-semibold w-full max-w-xs"
          >
            카카오로 시작하기
          </Button>
        </form>
      </div>
    </div>
  )
}

import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { useMe, useUpdateProfile } from "@/lib/api/hooks/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FieldErrors {
  display_name?: string;
  given_name?: string;
  family_name?: string;
  bio?: string;
}

export default function SettingsProfilePage() {
  const { data: me } = useMe();
  const updateProfile = useUpdateProfile();
  const [errors, setErrors] = useState<FieldErrors>({});

  function validate(form: FormData): FieldErrors | null {
    const errs: FieldErrors = {};
    const displayName = (form.get("display_name") as string)?.trim() ?? "";
    const givenName = (form.get("given_name") as string)?.trim() ?? "";
    const familyName = (form.get("family_name") as string)?.trim() ?? "";
    const bio = (form.get("bio") as string)?.trim() ?? "";

    if (!displayName || displayName.length < 1) {
      errs.display_name = "Tên hiển thị không được để trống.";
    } else if (displayName.length > 100) {
      errs.display_name = "Tên hiển thị tối đa 100 ký tự.";
    }

    if (givenName.length > 100) {
      errs.given_name = "Tên tối đa 100 ký tự.";
    }

    if (familyName.length > 100) {
      errs.family_name = "Họ tối đa 100 ký tự.";
    }

    if (bio.length > 1000) {
      errs.bio = "Giới thiệu tối đa 1000 ký tự.";
    }

    return Object.keys(errs).length > 0 ? errs : null;
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const fieldErrors = validate(formData);

    if (fieldErrors) {
      setErrors(fieldErrors);
      return;
    }

    setErrors({});

    updateProfile.mutate(
      {
        display_name: (formData.get("display_name") as string).trim() || null,
        given_name: (formData.get("given_name") as string).trim() || null,
        family_name: (formData.get("family_name") as string).trim() || null,
        bio: (formData.get("bio") as string).trim() || null,
      },
      {
        onSuccess: () => {
          toast.success("Đã lưu hồ sơ");
        },
        onError: () => {
          toast.error("Không thể lưu hồ sơ. Vui lòng thử lại.");
        },
      },
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Hồ sơ của bạn</CardTitle>
          <CardDescription>Cập nhật thông tin hiển thị công khai.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="display_name" className="text-sm font-medium text-foreground">
                Tên hiển thị <span className="text-destructive">*</span>
              </label>
              <Input
                id="display_name"
                name="display_name"
                required
                minLength={1}
                maxLength={100}
                defaultValue={me?.profile?.display_name ?? ""}
                aria-invalid={!!errors.display_name}
                aria-describedby={errors.display_name ? "err-display_name" : undefined}
              />
              {errors.display_name && (
                <p id="err-display_name" className="text-sm text-destructive">
                  {errors.display_name}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="given_name" className="text-sm font-medium text-foreground">
                Tên
              </label>
              <Input
                id="given_name"
                name="given_name"
                maxLength={100}
                defaultValue={me?.profile?.given_name ?? ""}
                aria-invalid={!!errors.given_name}
                aria-describedby={errors.given_name ? "err-given_name" : undefined}
              />
              {errors.given_name && (
                <p id="err-given_name" className="text-sm text-destructive">
                  {errors.given_name}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="family_name" className="text-sm font-medium text-foreground">
                Họ
              </label>
              <Input
                id="family_name"
                name="family_name"
                maxLength={100}
                defaultValue={me?.profile?.family_name ?? ""}
                aria-invalid={!!errors.family_name}
                aria-describedby={errors.family_name ? "err-family_name" : undefined}
              />
              {errors.family_name && (
                <p id="err-family_name" className="text-sm text-destructive">
                  {errors.family_name}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="bio" className="text-sm font-medium text-foreground">
                Giới thiệu
              </label>
              <textarea
                id="bio"
                name="bio"
                maxLength={1000}
                rows={4}
                defaultValue={me?.profile?.bio ?? ""}
                aria-invalid={!!errors.bio}
                aria-describedby={errors.bio ? "err-bio" : undefined}
                className={cn(
                  "w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 resize-y",
                )}
              />
              {errors.bio && (
                <p id="err-bio" className="text-sm text-destructive">
                  {errors.bio}
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="size-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Đang lưu...
                  </span>
                ) : (
                  "Lưu hồ sơ"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

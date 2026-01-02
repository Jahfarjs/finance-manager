import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { User, Mail, Phone, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import type { User as UserType } from "@shared/schema";

const profileFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone must be at least 10 digits"),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: ProfileFormData) =>
      api.put<{ user: Omit<UserType, "password"> }>("/user/profile", data),
    onSuccess: (response) => {
      updateUser(response.user);
      toast({ title: "Profile updated", description: "Your profile has been saved successfully." });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: ProfileFormData) => {
    updateMutation.mutate(data);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-profile-title">Profile</h1>
          <p className="text-muted-foreground">Manage your account settings</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {user?.name ? getInitials(user.name) : "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>{user?.name || "User"}</CardTitle>
                <CardDescription>{user?.email || ""}</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your personal details here</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    placeholder="Enter your full name"
                    {...form.register("name")}
                    data-testid="input-profile-name"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    {...form.register("email")}
                    data-testid="input-profile-email"
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    {...form.register("phone")}
                    data-testid="input-profile-phone"
                  />
                  {form.formState.errors.phone && (
                    <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-profile">
                  {updateMutation.isPending ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <span className="text-sm text-muted-foreground">Account ID</span>
                <span className="text-sm font-mono">{user?.id?.slice(0, 8) || "N/A"}...</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b">
                <span className="text-sm text-muted-foreground">Member Since</span>
                <span className="text-sm">
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-muted-foreground">Login Method</span>
                <span className="text-sm">Phone + Password</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

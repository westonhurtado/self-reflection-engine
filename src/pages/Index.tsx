import { MirrorChat } from "@/components/MirrorChat";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "WECKY") {
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPassword("");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-background-subtle">
        <div className="w-full max-w-md px-6">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-light mb-2 bg-gradient-primary bg-clip-text text-transparent">
              Me
            </h1>
            <p className="text-muted-foreground text-sm">Enter to reflect</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              placeholder="Password"
              className="text-center"
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive text-center animate-in fade-in">
                Incorrect password
              </p>
            )}
            <Button type="submit" className="w-full">
              Enter
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return <MirrorChat />;
};

export default Index;

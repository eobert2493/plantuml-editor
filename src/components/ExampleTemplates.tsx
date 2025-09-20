import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { FileCode, Database, Users, Workflow, Network, Clock } from "lucide-react";

interface ExampleTemplatesProps {
  onSelectTemplate: (template: string) => void;
}

const templates = [
  {
    name: "Class Diagram",
    icon: FileCode,
    description: "Object-oriented class relationships",
    code: `@startuml
class User {
  -id: Long
  -username: String
  -email: String
  +login()
  +logout()
}

class Post {
  -id: Long
  -title: String
  -content: String
  -createdAt: Date
  +publish()
  +unpublish()
}

class Comment {
  -id: Long
  -content: String
  -createdAt: Date
}

User ||--o{ Post : creates
Post ||--o{ Comment : has
User ||--o{ Comment : writes
@enduml`
  },
  {
    name: "Sequence Diagram",
    icon: Workflow,
    description: "Message flow between objects",
    code: `@startuml
actor User
participant "Web Browser" as Browser
participant "Web Server" as Server
database "Database" as DB

User -> Browser: Enter URL
Browser -> Server: HTTP Request
Server -> DB: Query Data
DB -> Server: Return Data
Server -> Browser: HTTP Response
Browser -> User: Display Page
@enduml`
  },
  {
    name: "Use Case Diagram",
    icon: Users,
    description: "System functionality and actors",
    code: `@startuml
left to right direction
actor Customer
actor Admin

rectangle "E-commerce System" {
  Customer --> (Browse Products)
  Customer --> (Add to Cart)
  Customer --> (Place Order)
  Customer --> (Make Payment)
  
  Admin --> (Manage Products)
  Admin --> (Process Orders)
  Admin --> (View Reports)
}
@enduml`
  },
  {
    name: "Activity Diagram",
    icon: Clock,
    description: "Workflow and process flow",
    code: `@startuml
start

:User opens app;
:Load user preferences;

if (User logged in?) then (yes)
  :Show dashboard;
else (no)
  :Show login screen;
  :User enters credentials;
  if (Credentials valid?) then (yes)
    :Login successful;
    :Show dashboard;
  else (no)
    :Show error message;
    stop
  endif
endif

:User interacts with app;
stop
@enduml`
  },
  {
    name: "Component Diagram",
    icon: Network,
    description: "System components and dependencies",
    code: `@startuml
package "Frontend" {
  [React App]
  [Redux Store]
  [Components]
}

package "Backend" {
  [API Gateway]
  [Auth Service]
  [Business Logic]
}

package "Database" {
  [PostgreSQL]
  [Redis Cache]
}

[React App] --> [API Gateway] : HTTP/REST
[Redux Store] --> [React App]
[Components] --> [Redux Store]
[API Gateway] --> [Auth Service]
[API Gateway] --> [Business Logic]
[Business Logic] --> [PostgreSQL]
[Business Logic] --> [Redis Cache]
@enduml`
  },
  {
    name: "ER Diagram",
    icon: Database,
    description: "Database entity relationships",
    code: `@startuml
entity "User" as user {
  * id : number <<PK>>
  --
  * username : varchar(50)
  * email : varchar(100)
  * password_hash : varchar(255)
  created_at : timestamp
}

entity "Order" as order {
  * id : number <<PK>>
  --
  * user_id : number <<FK>>
  * total_amount : decimal(10,2)
  * status : varchar(20)
  created_at : timestamp
}

entity "Product" as product {
  * id : number <<PK>>
  --
  * name : varchar(100)
  * description : text
  * price : decimal(10,2)
  * stock_quantity : integer
}

entity "OrderItem" as order_item {
  * order_id : number <<FK>>
  * product_id : number <<FK>>
  --
  * quantity : integer
  * price : decimal(10,2)
}

user ||--o{ order
order ||--o{ order_item
product ||--o{ order_item
@enduml`
  }
];

export const ExampleTemplates = ({ onSelectTemplate }: ExampleTemplatesProps) => {
  const handleSelectTemplate = (template: typeof templates[0]) => {
    onSelectTemplate(template.code);
    toast.success(`Loaded ${template.name} template`);
  };

  return (
    <Card className="bg-editor-panel border-editor-border">
      <div className="p-3 border-b border-editor-border">
        <h3 className="text-sm font-medium text-editor-text">Example Templates</h3>
        <p className="text-xs text-editor-comment mt-1">
          Click to load a template and start editing
        </p>
      </div>
      
      <ScrollArea className="h-64">
        <div className="p-2 space-y-2">
          {templates.map((template, index) => {
            const IconComponent = template.icon;
            return (
              <Button
                key={index}
                variant="ghost"
                className="w-full h-auto p-3 justify-start text-left hover:bg-editor-background border border-transparent hover:border-editor-border"
                onClick={() => handleSelectTemplate(template)}
              >
                <div className="flex items-start gap-3">
                  <IconComponent className="w-4 h-4 text-editor-keyword mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-editor-text">
                      {template.name}
                    </div>
                    <div className="text-xs text-editor-comment mt-0.5">
                      {template.description}
                    </div>
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
};
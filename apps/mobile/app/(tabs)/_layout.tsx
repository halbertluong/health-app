import { Tabs } from "expo-router";
import { CalendarDays, ShoppingCart, PlusCircle, Dumbbell, BarChart3 } from "lucide-react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#16a34a",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarStyle: { borderTopColor: "#e2e8f0" },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: "Today",
          tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="grocery"
        options={{
          title: "Grocery",
          tabBarIcon: ({ color, size }) => <ShoppingCart color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: "Log Meal",
          tabBarIcon: ({ color, size }) => <PlusCircle color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: "Workout",
          tabBarIcon: ({ color, size }) => <Dumbbell color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="snapshot"
        options={{
          title: "Week",
          tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
